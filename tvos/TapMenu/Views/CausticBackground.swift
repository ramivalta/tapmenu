import SwiftUI

/// Light through glass.
///
/// The pattern is a caustic *network* — cells, branches and knots — generated
/// once into a texture (see `CausticTexture`). Two copies of it are drawn at
/// slightly different scales, drifting in different directions. Where a ridge
/// in one crosses a ridge in the other they brighten, and because the two
/// drifts are unequal those crossings move continuously without ever
/// repeating. That interference is the whole animation: nothing is recomputed
/// per frame, which is what makes it affordable on a 2017 Apple TV.
///
/// It depicts nothing. Two earlier backdrops — a wave field and an aerial map
/// — both failed the same way: a picture invites the eye to read it, and
/// reading competes with reading the menu.
struct CausticBackground: View {
    /// Tints the light very slightly toward what is pouring.
    let taps: [Tap]

    @State private var texture: Image?

    /// Seconds for a layer to travel its own width. Slow: this should be
    /// movement noticed at the edge of vision, not watched.
    private static let slowDrift: TimeInterval = 240
    private static let fastDrift: TimeInterval = 170

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
            let time = context.date.timeIntervalSinceReferenceDate

            Canvas { canvas, size in
                guard let texture else { return }
                let resolved = canvas.resolve(texture)

                // Two layers at different scales and opposed drifts.
                layer(canvas, resolved, size, time, cycle: Self.slowDrift, scale: 1.0, direction: 1)
                layer(canvas, resolved, size, time, cycle: Self.fastDrift, scale: 1.27, direction: -1)
            }
        }
        .allowsHitTesting(false)
        .task {
            let bytes = await Task.detached(priority: .utility) {
                CausticTexture.pixels()
            }.value
            if let cgImage = CausticTexture.image(from: bytes) {
                withAnimation(.easeIn(duration: 1.6)) {
                    texture = Image(decorative: cgImage, scale: 1, orientation: .up)
                }
            }
        }
    }

    private func layer(
        _ canvas: GraphicsContext,
        _ image: GraphicsContext.ResolvedImage,
        _ size: CGSize,
        _ time: Double,
        cycle: TimeInterval,
        scale: CGFloat,
        direction: CGFloat
    ) {
        let tileWidth = size.width * scale
        let tileHeight = size.height * scale
        let phase = CGFloat((time / cycle).truncatingRemainder(dividingBy: 1))
        // Drifting diagonally, and the two layers oppose one another.
        let dx = direction * phase * tileWidth
        let dy = direction * phase * tileHeight * 0.35

        // Enough copies to cover the frame whatever the offset.
        for row in -1...1 {
            for column in -1...1 {
                canvas.draw(
                    image,
                    in: CGRect(
                        x: CGFloat(column) * tileWidth + dx.truncatingRemainder(dividingBy: tileWidth),
                        y: CGFloat(row) * tileHeight + dy.truncatingRemainder(dividingBy: tileHeight),
                        width: tileWidth,
                        height: tileHeight
                    )
                )
            }
        }
    }
}
