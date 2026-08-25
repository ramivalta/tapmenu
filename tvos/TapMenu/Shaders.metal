#include <metal_stdlib>
#include <SwiftUI/SwiftUI_Metal.h>

using namespace metal;

/// Refraction through water droplets.
///
/// A drop is a lens: it gathers light from a wider area than it covers and
/// turns the image over. So for any pixel inside a drop, this samples the
/// layer at a point reflected through the drop's centre and pulled inward —
/// which is why text behind a bead appears inverted and smaller, and why the
/// distortion increases toward the rim where the surface is steepest.
///
/// `drops` arrives as a flat array of (x, y, radius, stretch) quadruples.
[[ stitchable ]] half4 droplets(
    float2 position,
    SwiftUI::Layer layer,
    device const float *drops,
    int count
) {
    for (int i = 0; i + 3 < count; i += 4) {
        float2 centre = float2(drops[i], drops[i + 1]);
        float radius = drops[i + 2];
        float stretch = drops[i + 3];
        if (radius <= 0.0) { continue; }

        // Falling drops are longer than they are wide, so the test has to be
        // elliptical or the refraction will not follow the shape being drawn.
        float2 offset = position - centre;
        float2 scaled = float2(offset.x, offset.y / max(stretch, 1.0));
        float dist = length(scaled);
        if (dist >= radius) { continue; }

        // Normalised distance from the middle. A sphere's surface tilts more
        // steeply toward its edge, so the bend grows non-linearly.
        float n = dist / radius;
        float bend = 1.0 - sqrt(max(0.0, 1.0 - n * n));

        // Through the centre, and drawn in: inverted and reduced, as a lens
        // held above a page does.
        float2 sampled = centre - offset * (0.62 + bend * 0.85);
        return layer.sample(sampled);
    }
    return layer.sample(position);
}
