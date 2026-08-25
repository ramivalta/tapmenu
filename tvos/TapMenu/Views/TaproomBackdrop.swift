import SwiftUI

/// The brewery backdrop, ported from `layout.tsx`.
///
/// The web page layers a generated gradient (`noisy-gradient.svg`), the
/// Panimo Valta watermark, and a grain overlay behind every route. This
/// rebuilds that stack natively: the SVG's own values are reproduced as
/// SwiftUI gradients rather than converting an asset UIImage cannot read.
///
/// The watermark is the subject here. Three generated backdrops were tried
/// behind it — a wave field, an aerial map, a caustic network — and every one
/// of them buried it, which was the clearest signal that the mark should be
/// what the screen is *of*, not something competing for the same space. The
/// only movement is a broad light drifting across it: no forms, nothing to
/// read, just the illumination changing.
struct TaproomBackdrop: View {
    /// hsl(53, 11%, 87%) — the SVG's base rect, a warm pale sand.
    private static let base = Color(hue: 53 / 360, saturation: 0.032, brightness: 0.884)

    /// hsla(85, 20%, 76%) — the sage wash laid over the base.
    private static let sage = Color(hue: 85 / 360, saturation: 0.166, brightness: 0.807)

    var body: some View {
        ZStack {
            Self.base

            // The SVG rotates these ±190°, i.e. very slightly off vertical and
            // near-reversed, so both rise from the bottom with a small tilt.
            LinearGradient(
                colors: [.white, .white.opacity(0)],
                startPoint: UnitPoint(x: 0.41, y: 1),
                endPoint: UnitPoint(x: 0.59, y: 0)
            )
            LinearGradient(
                colors: [Self.sage, Self.sage.opacity(0)],
                startPoint: UnitPoint(x: 0.59, y: 1),
                endPoint: UnitPoint(x: 0.41, y: 0)
            )

            Color.white.opacity(0.42)

            // Centred watermark, full height, as in the web layout. Legible
            // now that nothing is layered on top of it.
            Image("Panimo_Valta-taustalogo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .opacity(0.42)

            // A slow wash of light across the whole screen. Broad enough that
            // it has no edge and no shape — it reads as the light in the room
            // changing rather than as anything moving on the screen.
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
                let time = context.date.timeIntervalSinceReferenceDate
                let sweep = (time / 90).truncatingRemainder(dividingBy: 1)
                let lift = (time / 47).truncatingRemainder(dividingBy: 1)

                LinearGradient(
                    stops: [
                        .init(color: .white.opacity(0), location: 0),
                        .init(color: .white.opacity(0.34), location: 0.5),
                        .init(color: .white.opacity(0), location: 1),
                    ],
                    startPoint: UnitPoint(x: sweep * 2.4 - 1.2, y: 0),
                    endPoint: UnitPoint(x: sweep * 2.4 - 0.2, y: 1)
                )
                .blendMode(.softLight)
                .opacity(0.55 + 0.25 * sin(lift * 2 * .pi))
            }

            if let grain = GrainTexture.image {
                grain
                    .resizable(resizingMode: .tile)
                    .blendMode(.softLight)
                    .opacity(0.13)
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}
