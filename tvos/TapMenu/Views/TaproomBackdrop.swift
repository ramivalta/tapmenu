import SwiftUI

/// The brewery backdrop, ported from `layout.tsx`.
///
/// The web page layers a generated gradient (`noisy-gradient.svg`), the
/// Panimo Valta watermark, and a grain overlay behind every route. This
/// rebuilds that stack natively: the SVG's own values are reproduced as
/// SwiftUI gradients rather than converting an asset UIImage cannot read.
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

            // Centred watermark, full height, as in the web layout.
            Image("Panimo_Valta-taustalogo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .opacity(0.30)

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
