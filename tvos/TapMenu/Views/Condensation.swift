import SwiftUI

/// Moisture beading on the menu board, as it would on a cold glass — and
/// occasionally letting go.
///
/// Split in two on purpose. `drops(at:)` works out where every bead is at a
/// given moment and returns it; this view only paints them. The same states
/// feed the refraction shader, which has to distort the board's own pixels
/// underneath each bead, and computing the positions twice would let the
/// painted lens and the refracted image drift out of register.
///
/// The painted part is the lighting: a drop is a lens, so light arriving from
/// the upper left leaves it *darker* where the light comes from and brightest
/// opposite, with a bright rim and a small specular glint. The shader supplies
/// what is seen through it.
struct Condensation: View {
    /// Where a bead is, and what shape it has been pulled into.
    struct Drop {
        let centre: CGPoint
        let radius: CGFloat
        let stretch: CGFloat
        let alpha: Double
        /// The drying trail behind a sliding bead.
        let track: CGRect?
        /// False once it has left the board and is falling through air.
        let onBoard: Bool
    }

    let drops: [Drop]

    /// Where the light is coming from, matching the backdrop's drifting sweep.
    private static let lightAngle = CGVector(dx: -0.62, dy: -0.78)

    var body: some View {
        Canvas { canvas, _ in
            for drop in drops {
                if let track = drop.track {
                    canvas.fill(
                        Path(roundedRect: track, cornerRadius: track.width / 2),
                        with: .linearGradient(
                            Gradient(colors: [
                                Palette.ink.opacity(0),
                                Palette.ink.opacity(0.055),
                            ]),
                            startPoint: CGPoint(x: 0, y: track.minY),
                            endPoint: CGPoint(x: 0, y: track.maxY)
                        )
                    )
                }
                render(drop, in: canvas)
            }
        }
        .allowsHitTesting(false)
    }

    // MARK: - Painting

    private func render(_ drop: Drop, in canvas: GraphicsContext) {
        let r = drop.radius
        let centre = drop.centre
        let alpha = drop.alpha
        let shape = Self.teardrop(centre: centre, radius: r, stretch: drop.stretch)

        // Shadow, cast away from the light.
        canvas.fill(
            shape.applying(
                CGAffineTransform(
                    translationX: -Self.lightAngle.dx * r * 0.5,
                    y: -Self.lightAngle.dy * r * 0.5
                )
            ),
            with: .color(Palette.ink.opacity(0.13 * alpha))
        )

        // Shading along the light's axis. Lighter than it was, because the
        // refraction underneath now carries most of the read — this only has
        // to describe the surface, not stand in for what is behind it.
        canvas.fill(
            shape,
            with: .linearGradient(
                Gradient(stops: [
                    .init(color: Palette.ink.opacity(0.10 * alpha), location: 0),
                    .init(color: Palette.ink.opacity(0.01 * alpha), location: 0.45),
                    .init(color: .white.opacity(0.26 * alpha), location: 1),
                ]),
                startPoint: CGPoint(
                    x: centre.x + Self.lightAngle.dx * r,
                    y: centre.y + Self.lightAngle.dy * r
                ),
                endPoint: CGPoint(
                    x: centre.x - Self.lightAngle.dx * r,
                    y: centre.y - Self.lightAngle.dy * r
                )
            )
        )

        // Bright rim where the light exits. Capped: a rim that scales with the
        // bead turns into a drawn outline once the bead is large.
        canvas.stroke(
            shape,
            with: .color(.white.opacity(0.26 * alpha)),
            lineWidth: min(1.8, max(0.5, r * 0.11))
        )

        // Specular pinpoint. A highlight is an image of the light source, so
        // it stays small however big the drop is.
        let spec = min(3.4, 0.9 + r * 0.13)
        let at = CGPoint(
            x: centre.x + Self.lightAngle.dx * r * 0.46,
            y: centre.y + Self.lightAngle.dy * r * 0.46
        )
        canvas.fill(
            Path(
                ellipseIn: CGRect(
                    x: at.x - spec, y: at.y - spec,
                    width: spec * 2, height: spec * 2
                )
            ),
            with: .radialGradient(
                Gradient(stops: [
                    .init(color: .white.opacity(0.85 * alpha), location: 0),
                    .init(color: .white.opacity(0.45 * alpha), location: 0.45),
                    .init(color: .white.opacity(0), location: 1),
                ]),
                center: at,
                startRadius: 0,
                endRadius: spec
            )
        )
    }

    /// Round at the bottom, tapering above.
    ///
    /// The control points are interpolated from the circle's own, so at
    /// `stretch` of 1 this *is* a circle and the shape grows a neck
    /// continuously as it stretches. They also stay convex at the shoulders:
    /// controls placed inside the circle bow the upper edges inward, which
    /// reads as a kite.
    static func teardrop(
        centre: CGPoint,
        radius r: CGFloat,
        stretch: CGFloat
    ) -> Path {
        let cx = centre.x
        let cy = centre.y
        let k: CGFloat = 0.5523 * r
        let drawn = min(1, max(0, (stretch - 1) / 1.4))

        func lerp(_ a: CGFloat, _ b: CGFloat) -> CGFloat { a + (b - a) * drawn }

        let tip = CGPoint(x: cx, y: cy - r * stretch)
        let neckX = lerp(k, r * 0.26)
        let neckY = lerp(r, r * stretch * 0.64)
        let shoulderY = lerp(k, r * 0.70)

        var path = Path()
        path.move(to: tip)
        path.addCurve(
            to: CGPoint(x: cx - r, y: cy),
            control1: CGPoint(x: cx - neckX, y: cy - neckY),
            control2: CGPoint(x: cx - r, y: cy - shoulderY)
        )
        path.addCurve(
            to: CGPoint(x: cx, y: cy + r),
            control1: CGPoint(x: cx - r, y: cy + k),
            control2: CGPoint(x: cx - k, y: cy + r)
        )
        path.addCurve(
            to: CGPoint(x: cx + r, y: cy),
            control1: CGPoint(x: cx + k, y: cy + r),
            control2: CGPoint(x: cx + r, y: cy + k)
        )
        path.addCurve(
            to: tip,
            control1: CGPoint(x: cx + r, y: cy - shoulderY),
            control2: CGPoint(x: cx + neckX, y: cy - neckY)
        )
        path.closeSubpath()
        return path
    }

    // MARK: - Where every bead is

    /// Points per second squared once a drop is in free air. Real gravity in
    /// screen units would be far too fast to see.
    private static let gravity: CGFloat = 520

    static func drops(
        at time: Double,
        boardSize: CGSize,
        fallZone: CGFloat
    ) -> [Drop] {
        guard boardSize.width > 0, boardSize.height > 0 else { return [] }
        let boardHeight = boardSize.height

        return beads.compactMap { bead -> Drop? in
            let restingY = bead.y * boardHeight

            guard let glide = bead.glide else {
                let x = bead.x * boardSize.width
                return Drop(
                    centre: CGPoint(x: x, y: restingY),
                    radius: bead.radius, stretch: 1, alpha: 1,
                    track: nil, onBoard: true
                )
            }

            // Which run this is, so each one can start somewhere different.
            // A bead that always re-forms where it last ran reads as a fixed
            // dripping point rather than as condensation.
            let approxPeriod = Double(boardHeight / glide) * 1.6 + bead.restFor + 2
            let run = Int((time + bead.offset) / max(approxPeriod, 1))
            let x = random(bead.seed &* 7919 &+ run &* 104_729) * boardSize.width
            let startY = random(bead.seed &* 6151 &+ run &* 92_821) * 0.72 * boardHeight

            let toEdge = max(0, boardHeight - startY)
            // Easing means the average rate is about half the peak, so the
            // duration has to allow for it or the run ends before the edge.
            let slideFor = Double(toEdge / glide) * 1.6
            let fallFor = Double(
                (-glide + (glide * glide + 2 * gravity * fallZone).squareRoot()) / gravity
            )

            let period = slideFor + fallFor + bead.restFor
            let cycle = (time + bead.offset).truncatingRemainder(dividingBy: period)

            guard cycle < slideFor + fallFor else {
                // Resting between runs, and fading in as it re-forms: a bead
                // that simply appeared at a new spot would pop.
                let resting = cycle - (slideFor + fallFor)
                return Drop(
                    centre: CGPoint(x: x, y: startY),
                    radius: bead.radius, stretch: 1,
                    alpha: min(1, resting / 4),
                    track: nil, onBoard: true
                )
            }

            if cycle < slideFor {
                // Starting reluctantly and picking up, which is how a bead
                // actually breaks free. A constant rate looks like a rail.
                let progress = CGFloat(cycle / slideFor)
                let travelled = toEdge * pow(progress, 1.5)
                return Drop(
                    centre: CGPoint(x: x, y: startY + travelled),
                    radius: bead.radius,
                    stretch: 1 + progress * progress * 0.34,
                    alpha: 1,
                    track: CGRect(
                        x: x - bead.radius * 0.30, y: startY,
                        width: bead.radius * 0.60, height: travelled
                    ),
                    onBoard: true
                )
            }

            // Free air: accelerating, stretching with speed, fading as it goes.
            let t = CGFloat(cycle - slideFor)
            let fallen = glide * t + 0.5 * gravity * t * t
            let speed = glide + gravity * t
            return Drop(
                centre: CGPoint(x: x, y: boardHeight + fallen),
                radius: bead.radius,
                stretch: 1.35 + min(3.0, speed / 260),
                alpha: 1 - Double(min(0.9, fallen / fallZone)),
                track: nil,
                onBoard: false
            )
        }
    }

    /// The drops the refraction shader should distort: those still on the
    /// glass, largest first and capped, since the shader tests every pixel
    /// against every drop it is given.
    static func shaderArguments(_ drops: [Drop], limit: Int = 22) -> [Float] {
        drops
            .filter { $0.onBoard && $0.radius > 2.4 }
            .sorted { $0.radius > $1.radius }
            .prefix(limit)
            .flatMap { [
                Float($0.centre.x), Float($0.centre.y),
                Float($0.radius), Float($0.stretch),
            ] }
    }

    // MARK: - Beads

    private struct Bead {
        let seed: Int
        let x: CGFloat
        let y: CGFloat
        let radius: CGFloat
        /// Points per second while still stuck to the glass.
        let glide: CGFloat?
        /// Seconds of stillness between runs.
        let restFor: Double
        let offset: Double
    }

    /// Deterministic, so the board does not rearrange its own moisture on
    /// every launch.
    ///
    /// This is the splitmix64 finaliser. The previous hash was a 32-bit mix
    /// that correlated badly across small consecutive seeds — beads 1 and 27
    /// came out at x = 0.726 and 0.727, so two separate drops ran from what
    /// looked like the same spot.
    private static func random(_ seed: Int) -> CGFloat {
        var x = UInt64(bitPattern: Int64(seed)) &+ 0x9E37_79B9_7F4A_7C15
        x = (x ^ (x >> 30)) &* 0xBF58_476D_1CE4_E5B9
        x = (x ^ (x >> 27)) &* 0x94D0_49BB_1331_11EB
        x = x ^ (x >> 31)
        return CGFloat(x % 100_000) / 100_000
    }

    private static let beads: [Bead] = (0..<64).map { index in
        let roll = random(index &* 7 &+ 3)
        let spread = random(index &* 31 &+ 19)

        // A wide range rather than two clumps: mostly fine misting, a decent
        // middle, and the occasional one that has gathered properly.
        let radius: CGFloat
        if roll > 0.98 {
            radius = 13 + spread * 8
        } else if roll > 0.92 {
            radius = 7.5 + spread * 5.5
        } else if roll > 0.74 {
            radius = 3.5 + spread * 4.0
        } else {
            radius = 0.9 + spread * 2.6
        }

        let runs = radius > 4.6 && random(index &* 13 &+ 9) > 0.22

        return Bead(
            seed: index,
            x: random(index &* 3 &+ 1),
            y: random(index &* 5 &+ 2) * 0.75,
            radius: radius,
            // Weight helps, but the spread between beads is deliberately
            // wide: two drops of the same size should not run in step.
            glide: runs
                ? 10 + max(0, radius - 4.6) * 1.9 + random(index &* 17 &+ 11) * 38
                : nil,
            restFor: 25 + Double(random(index &* 23 &+ 15)) * 105,
            offset: Double(random(index &* 29 &+ 17)) * 160
        )
    }
}
