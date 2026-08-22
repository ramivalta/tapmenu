import SwiftUI

/// The wave field behind the whole menu.
///
/// Evolved from the static `TapWindBackground.tsx` port in two steps. First it
/// became one screen-wide field rather than four per-card slices, which had a
/// seam at every card boundary and a hole wherever a tap was empty. Then the
/// motion changed: translating fixed geometry reads as a picture sliding past,
/// not as water.
///
/// So each layer is now a **sum of travelling sine components** evaluated per
/// frame, with different wavelengths and different speeds — some drifting
/// left, some right. Because the components move at different rates they drift
/// in and out of phase, so crests build, peak and dissolve. That interference
/// is what makes it look like a surface rather than a shape in motion, and it
/// also removes any wrap seam: time lives in the phase, so there is nothing to
/// tile.
///
/// Per-frame evaluation is roughly 4 layers × 320 samples × 3 sines at 30fps.
/// That was worth avoiding on the A8 of a 2015 Apple TV; on an Apple TV 4K it
/// is not worth a thought.
struct MenuBackground: View {
    let taps: [Tap]

    private static let layerCount = 4
    /// Horizontal sampling step in points. Six is well under the curvature of
    /// the longest wavelength, so the polyline reads as smooth.
    private static let sampleStep: CGFloat = 6

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
            let time = context.date.timeIntervalSinceReferenceDate

            Canvas { canvas, size in
                for index in 0..<Self.layerCount {
                    let layer = Self.layer(index)
                    let path = Self.path(for: layer, size: size, time: time)
                    canvas.fill(
                        path,
                        with: .linearGradient(
                            tintGradient(opacity: 0.20 - Double(index) * 0.035),
                            startPoint: .zero,
                            endPoint: CGPoint(x: size.width, y: 0)
                        )
                    )
                }
            }
        }

        .allowsHitTesting(false)
    }

    // MARK: - Wave model

    /// One travelling wave, as `sin(k(x - ct))` — so `phaseVelocity` moves the
    /// crests bodily across the screen.
    ///
    /// Every component travels the *same* direction, which is what gives the
    /// field visible horizontal drift. Earlier versions mixed directions: the
    /// components cancelled into an in-place wobble with no sense of travel.
    /// Longer waves are given higher velocities, as in deep water, so the
    /// components disperse and the profile keeps reshaping as it moves.
    private struct Component {
        let amplitude: CGFloat  // fraction of height
        let wavelength: CGFloat  // fraction of width
        let phaseVelocity: CGFloat  // points per second, rightward
        let phase: CGFloat
    }

    private struct Layer {
        let baseY: CGFloat  // fraction of height
        let thickness: CGFloat  // fraction of height
        let thicknessWavelength: CGFloat
        let thicknessVelocity: CGFloat
        let components: [Component]
    }

    /// Four bands down the screen, each slower and heavier than the last, so
    /// the field reads as receding depth rather than four copies.
    private static func layer(_ i: Int) -> Layer {
        let f = CGFloat(i)
        return Layer(
            baseY: 0.17 + 0.21 * f,
            thickness: 0.013 + 0.006 * f,
            thicknessWavelength: 0.8 + 0.1 * f,
            thicknessVelocity: 26 - 3 * f,
            components: [
                Component(
                    amplitude: 0.030 + 0.004 * f,
                    wavelength: 0.62 - 0.06 * f,
                    phaseVelocity: 34 - 2 * f,
                    phase: 1.2 * f
                ),
                Component(
                    amplitude: 0.016,
                    wavelength: 0.31 + 0.04 * f,
                    phaseVelocity: 21 - 1.5 * f,
                    phase: 2.4 * f
                ),
                Component(
                    amplitude: 0.008,
                    wavelength: 0.17,
                    phaseVelocity: 13,
                    phase: 0.7 * f
                ),
            ]
        )
    }

    private static func path(for layer: Layer, size: CGSize, time: Double) -> Path {
        let width = size.width
        let height = size.height
        guard width > 0, height > 0 else { return Path() }

        let baseY = layer.baseY * height
        let thickness = layer.thickness * height
        let thicknessK = 2 * CGFloat.pi / max(layer.thicknessWavelength * width, 1)

        var upper: [CGPoint] = []
        var lower: [CGPoint] = []
        upper.reserveCapacity(Int(width / sampleStep) + 2)
        lower.reserveCapacity(Int(width / sampleStep) + 2)

        var x: CGFloat = 0
        while x <= width + sampleStep {
            let clamped = min(x, width)

            var y = baseY
            for component in layer.components {
                let k = 2 * CGFloat.pi / max(component.wavelength * width, 1)
                let travelled = clamped - component.phaseVelocity * CGFloat(time)
                y +=
                    sin(travelled * k + component.phase)
                    * (component.amplitude * height)
            }

            let swellX = clamped - layer.thicknessVelocity * CGFloat(time)
            let swell = 0.5 + 0.5 * sin(swellX * thicknessK)
            let halfHeight = thickness * (0.35 + 0.65 * swell)

            upper.append(CGPoint(x: clamped, y: y - halfHeight))
            lower.append(CGPoint(x: clamped, y: y + halfHeight))
            x += sampleStep
        }

        var path = Path()
        guard let first = upper.first else { return path }
        path.move(to: first)
        for point in upper.dropFirst() { path.addLine(to: point) }
        for point in lower.reversed() { path.addLine(to: point) }
        path.closeSubpath()
        return path
    }

    // MARK: - Colour

    private func tintGradient(opacity: Double) -> Gradient {
        Gradient(
            stops: columnStops(blend: 0.10) { tap in
                Palette.hsl(tap.beer?.waveColor ?? Self.neutralTint, opacity: opacity)
            }
        )
    }

    /// Neutral fallback matching `getStyleColor`'s default in beerStyleColors.
    private static let neutralTint = Beer.WaveColor(
        hue: 195, saturation: 30, lightness: 75
    )

    /// Two stops per tap, so each beer's colour holds flat across its own
    /// column and only `blend` (as a fraction of the whole width) is spent
    /// transitioning at each boundary.
    ///
    /// A single stop per tap centre — the earlier approach — interpolates
    /// across the entire column, which is why no colour ever looked like it
    /// belonged to a particular beer. A small blend keeps the band continuous;
    /// a large one turns it back into an indistinct smear.
    private func columnStops(
        blend: Double,
        _ color: (Tap) -> Color
    ) -> [Gradient.Stop] {
        guard !taps.isEmpty else { return [.init(color: .clear, location: 0)] }

        let count = Double(taps.count)
        let resolved = taps.indices.map { index -> Color in
            if taps[index].beer != nil { return color(taps[index]) }
            // An empty tap borrows a neighbour: a grey hole in the wave
            // field would reintroduce exactly the break we removed.
            let neighbour = taps.indices
                .filter { taps[$0].beer != nil }
                .min { abs($0 - index) < abs($1 - index) }
            return neighbour.map { color(taps[$0]) } ?? color(taps[index])
        }

        // Half the blend either side of each boundary.
        let pad = min(blend / 2, 0.5 / count)

        var stops: [Gradient.Stop] = []
        for (index, tint) in resolved.enumerated() {
            let start = Double(index) / count
            let end = Double(index + 1) / count
            stops.append(.init(color: tint, location: index == 0 ? 0 : start + pad))
            stops.append(
                .init(color: tint, location: index == resolved.count - 1 ? 1 : end - pad)
            )
        }
        return stops
    }
}
