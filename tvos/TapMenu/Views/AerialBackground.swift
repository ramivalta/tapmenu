import SwiftUI

/// The ground seen from straight above, through cloud.
///
/// A map rather than a view: no horizon, no perspective. Distance is carried
/// entirely by parallax — land creeps, haze sits still, cloud slides — and by
/// how washed out everything is. A perspective version of this exists in the
/// history and reads as a landing approach, which turned out to be a busier,
/// less restful thing to sit behind a menu all evening.
///
/// The terrain itself is generated from noise (see `TerrainGenerator`) and
/// rendered once into a bitmap, then simply translated each frame: a Canvas
/// cannot evaluate half a million pixels of fractal noise at 30fps, and it
/// does not need to — the ground does not change, it only moves.
struct AerialBackground: View {
    /// Used only to tint the haze, so the ground still carries a hint of what
    /// is actually pouring.
    let taps: [Tap]

    /// Generated off the main actor at launch; the base gradient shows until
    /// it arrives, then it fades in.
    @State private var ground: Image?

    /// The ground barely moves at altitude; cloud is what you notice.
    private static let groundCycle: TimeInterval = 600
    private static let cloudCycle: TimeInterval = 110

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
            let time = context.date.timeIntervalSinceReferenceDate

            Canvas { canvas, size in
                base(canvas, size)
                if let ground {
                    land(canvas, size, time, ground)
                }
                haze(canvas, size)
                clouds(canvas, size, time)
            }
        }
        .allowsHitTesting(false)
        .task {
            // Half a million pixels of fractal noise, which is not something
            // to do on the main actor while the menu is drawing.
            let bytes = await Task.detached(priority: .utility) {
                TerrainGenerator.pixels()
            }.value
            if let cgImage = TerrainGenerator.image(from: bytes) {
                withAnimation(.easeIn(duration: 1.2)) {
                    ground = Image(decorative: cgImage, scale: 1, orientation: .up)
                }
            }
        }
    }

    // MARK: - Layers

    /// Shows while the terrain is still being generated, and underneath it
    /// afterwards, so nothing ever flashes empty.
    private func base(_ canvas: GraphicsContext, _ size: CGSize) {
        canvas.fill(
            Path(CGRect(origin: .zero, size: size)),
            with: .linearGradient(
                Gradient(colors: [
                    Color(hue: 76 / 360, saturation: 0.12, brightness: 0.88),
                    Color(hue: 52 / 360, saturation: 0.16, brightness: 0.85),
                ]),
                startPoint: .zero,
                endPoint: CGPoint(x: 0, y: size.height)
            )
        )
    }

    /// The ground, drawn twice so the wrap is seamless. The bitmap is
    /// x-periodic, so its right edge continues into its left.
    private func land(
        _ canvas: GraphicsContext,
        _ size: CGSize,
        _ time: Double,
        _ image: Image
    ) {
        let phase = CGFloat(
            (time / Self.groundCycle).truncatingRemainder(dividingBy: 1)
        )
        let travel = phase * size.width
        let resolved = canvas.resolve(image)

        for repetition in 0..<2 {
            canvas.draw(
                resolved,
                in: CGRect(
                    x: CGFloat(repetition) * size.width - travel,
                    y: 0,
                    width: size.width,
                    height: size.height
                )
            )
        }
    }

    /// Air between here and there. Without this the ground reads as a pattern
    /// on a surface a few feet away rather than as terrain a long way down.
    private func haze(_ canvas: GraphicsContext, _ size: CGSize) {
        canvas.fill(
            Path(CGRect(origin: .zero, size: size)),
            with: .linearGradient(
                tintGradient(),
                startPoint: .zero,
                endPoint: CGPoint(x: size.width, y: 0)
            )
        )
    }

    /// Cloud, in two banks at different speeds. Drawn as radial gradients
    /// rather than blurred shapes: a blur is a full-layer effect and this has
    /// to hold 30fps on a 2017 Apple TV.
    private func clouds(_ canvas: GraphicsContext, _ size: CGSize, _ time: Double) {
        for bank in Self.cloudBanks {
            let phase = CGFloat(
                (time / (Self.cloudCycle * bank.slowness))
                    .truncatingRemainder(dividingBy: 1)
            )
            let travel = phase * size.width

            for repetition in 0..<2 {
                let dx = CGFloat(repetition) * size.width - travel
                for puff in bank.puffs {
                    let centre = CGPoint(
                        x: puff.x * size.width + dx,
                        y: puff.y * size.height
                    )
                    let rx = puff.radius * size.width
                    let ry = rx * puff.squash
                    canvas.fill(
                        Path(
                            ellipseIn: CGRect(
                                x: centre.x - rx,
                                y: centre.y - ry,
                                width: rx * 2,
                                height: ry * 2
                            )
                        ),
                        with: .radialGradient(
                            Gradient(stops: [
                                .init(color: .white.opacity(bank.opacity), location: 0),
                                .init(color: .white.opacity(bank.opacity * 0.5), location: 0.5),
                                .init(color: .white.opacity(0), location: 1),
                            ]),
                            center: centre,
                            startRadius: 0,
                            endRadius: max(rx, ry)
                        )
                    )
                }
            }
        }
    }

    // MARK: - Colour

    /// Haze tinted by what is on tap, so a beer's colour still reaches the
    /// backdrop — the same trick the wave field used, at lower strength.
    private func tintGradient() -> Gradient {
        guard !taps.isEmpty else {
            return Gradient(colors: [Self.hazeBase, Self.hazeBase])
        }

        let count = Double(taps.count)
        var stops: [Gradient.Stop] = []
        for (index, tap) in taps.enumerated() {
            // Uniformly thick, tinted only slightly by what is pouring. The
            // previous version made the tinted stops *more* transparent, so a
            // beer's colour thinned the haze instead of colouring it.
            let colour = tap.beer
                .flatMap { Palette.hex($0.color) }
                .map { Self.hazeVeil.opacity(Self.hazeStrength * 0.88).blended(with: $0) }
                ?? Self.hazeVeil.opacity(Self.hazeStrength)
            let start = Double(index) / count
            let end = Double(index + 1) / count
            stops.append(.init(color: colour, location: index == 0 ? 0 : start + 0.06))
            stops.append(
                .init(color: colour, location: index == taps.count - 1 ? 1 : end - 0.06)
            )
        }
        return Gradient(stops: stops)
    }

    private static let hazeVeil = Color(
        hue: 56 / 360, saturation: 0.05, brightness: 0.985
    )
    /// How far back the ground sits. The terrain became detailed enough to
    /// compete with the menu, and the menu has to win.
    private static let hazeStrength: Double = 0.62

    private static let hazeBase = hazeVeil.opacity(hazeStrength)

    // MARK: - Cloud

    private struct Puff {
        let x: CGFloat
        let y: CGFloat
        let radius: CGFloat
        let squash: CGFloat
    }

    private struct CloudBank {
        let puffs: [Puff]
        /// Higher is slower, so the far bank trails the near one.
        let slowness: Double
        let opacity: Double
    }

    /// Deterministic, so the sky is the same every launch — a display that
    /// rearranged its own scenery on restart would be unsettling.
    private static func random(_ seed: Int) -> CGFloat {
        var t = UInt32(truncatingIfNeeded: seed &+ 0x6D2B_79F5)
        t = (t ^ (t >> 15)) &* (t | 1)
        t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
        return CGFloat((t ^ (t >> 14)) % 10000) / 10000
    }

    private static let cloudBanks: [CloudBank] = [
        // Far bank: small, faint, slow.
        CloudBank(
            puffs: (0..<10).map { index in
                Puff(
                    x: random(index &* 5 &+ 21),
                    y: random(index &* 9 &+ 22),
                    radius: 0.05 + random(index &* 3 &+ 23) * 0.05,
                    squash: 0.4 + random(index &* 7 &+ 24) * 0.3
                )
            },
            slowness: 2.8,
            opacity: 0.34
        ),
        // Near bank: large, soft, quick — this is the layer that sells height.
        CloudBank(
            puffs: (0..<6).map { index in
                Puff(
                    x: random(index &* 5 &+ 41),
                    y: random(index &* 9 &+ 42),
                    radius: 0.17 + random(index &* 3 &+ 43) * 0.15,
                    squash: 0.32 + random(index &* 7 &+ 44) * 0.22
                )
            },
            slowness: 1,
            opacity: 0.6
        ),
    ]
}
