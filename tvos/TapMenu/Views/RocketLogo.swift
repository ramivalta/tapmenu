import SwiftUI

/// The Panimo Valta wordmark and hop-cone rocket, with the animations the web
/// version plays — ported from `RocketLogo.tsx` and the keyframes in
/// `globals.css`.
///
/// Every minute it rolls for one of three things, at the web's odds: a
/// thruster burn, a smoke puff, a re-entry, or nothing at all. The point is
/// that a wall display should occasionally do something, without ever doing
/// something on a schedule anyone can predict.
///
/// The rocket is a bundled image rather than a path: the SVG in the web
/// component is one 6,800-character path, and tvOS cannot load SVG anyway.
/// Flames, smoke and the nose glow are drawn natively, so they animate freely.
struct RocketLogo: View {
    private enum Sequence {
        case idle
        /// Thruster burn: flames, nose glow, a lean, for a random 2–20s.
        case firing
        /// Smoke only, no burn.
        case puffing
        /// Tips nose-down, heats up, shakes, then rights itself.
        case reentry
    }

    // Re-entry is compressed from the web's 84 seconds. Still leisurely, but
    // an unattended display shouldn't spend a minute and a half on one gag.
    private static let reentryRamp: Duration = .seconds(24)
    private static let reentryShakeAt: Duration = .seconds(12)
    private static let reentryRighting: Duration = .seconds(8)

    /// How often to roll for something to happen, as on the web.
    private static let rollInterval: Duration = .seconds(60)

    let rocketHeight: CGFloat

    @State private var sequence: Sequence = .idle
    @State private var rotation: Double = 0
    @State private var glow: Double = 0
    @State private var shaking = false
    @State private var burnStarted: Date?
    @State private var smokeStarted: Date?

    private var burning: Bool {
        sequence == .firing || (sequence == .reentry && glow > 0.9)
    }

    var body: some View {
        HStack(spacing: 28) {
            Image("textLogo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(height: rocketHeight * 0.62)

            rocket
        }
        .task { await rollForever() }
    }

    private var rocket: some View {
        ZStack {
            // Flames sit behind and below, at the exhaust.
            if let burnStarted, burning {
                Flames(start: burnStarted)
                    .frame(width: rocketHeight * 0.46, height: rocketHeight * 0.66)
                    .offset(y: rocketHeight * 0.72)
                    .transition(.opacity)
            }

            if let smokeStarted {
                Smoke(start: smokeStarted)
                    .frame(width: rocketHeight * 0.62, height: rocketHeight * 0.62)
                    .offset(y: rocketHeight * 0.95)
            }

            Image("rocket")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(height: rocketHeight)

            // Nose glow: re-entry heating, and a flicker of it under thrust.
            if glow > 0.01 {
                let radius = rocketHeight * (0.10 + glow * 0.30)
                Ellipse()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color(red: 1, green: 0.04, blue: 0).opacity(0.6 + glow * 0.35),
                                Color(red: 1, green: 0.12, blue: 0.04).opacity(0.35 + glow * 0.3),
                                .clear,
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: radius
                        )
                    )
                    // Comfortably larger than the fade radius, so the gradient
                    // reaches transparent before the ellipse clips it.
                    .frame(width: radius * 2.5, height: radius * 2.9)
                    .offset(y: -rocketHeight * 0.46)
                    .allowsHitTesting(false)
            }
        }
        .rotationEffect(.degrees(rotation))
        .modifier(Shake(active: shaking, amplitude: rocketHeight * 0.012))
    }

    // MARK: - Scheduling

    private func rollForever() async {
        while true {
            do {
                try await Task.sleep(for: Self.rollInterval)
            } catch {
                return
            }
            guard sequence == .idle else { continue }

            // Same odds as the web: 25% re-entry, 25% burn, 20% puff, 30% nothing.
            switch Double.random(in: 0..<1) {
            case 0.75...: await reentry()
            case 0.5..<0.75: await fire()
            case 0.3..<0.5: await puff()
            default: break
            }
        }
    }

    private func fire() async {
        sequence = .firing
        burnStarted = .now
        smokeStarted = .now

        // Random burn length and an occasional lean, as on the web.
        let seconds = Double.random(in: 2...20)
        let lean = Double.random(in: 0..<1) > 0.4 ? Double.random(in: -15...15) : 0

        withAnimation(.easeInOut(duration: 0.6)) { glow = 0.35 }
        withAnimation(.easeInOut(duration: seconds * 0.3)) { rotation = lean }

        guard await sleep(.seconds(seconds)) else { return reset() }

        withAnimation(.easeOut(duration: 2.5)) { glow = 0 }
        withAnimation(.easeOut(duration: 0.8)) { rotation = 0 }
        _ = await sleep(.seconds(3))
        burnStarted = nil
        smokeStarted = nil
        sequence = .idle
    }

    private func puff() async {
        sequence = .puffing
        smokeStarted = .now
        guard await sleep(.seconds(4)) else { return reset() }
        smokeStarted = nil
        sequence = .idle
    }

    private func reentry() async {
        sequence = .reentry

        // Nose-down, and start heating.
        withAnimation(.easeInOut(duration: 12)) { rotation = 160 }
        withAnimation(.easeIn(duration: Double(Self.reentryRamp.components.seconds))) {
            glow = 0.85
        }

        guard await sleep(Self.reentryShakeAt) else { return reset() }
        shaking = true

        guard await sleep(Self.reentryRamp - Self.reentryShakeAt) else { return reset() }

        // Thrusters catch, and it rights itself.
        shaking = false
        burnStarted = .now
        smokeStarted = .now
        withAnimation(.easeOut(duration: 1)) { glow = 1 }
        withAnimation(.easeInOut(duration: Double(Self.reentryRighting.components.seconds))) {
            rotation = 0
        }

        guard await sleep(Self.reentryRighting) else { return reset() }

        withAnimation(.easeOut(duration: 6)) { glow = 0 }
        guard await sleep(.seconds(6)) else { return reset() }
        burnStarted = nil
        smokeStarted = nil
        sequence = .idle
    }

    /// Returns false when cancelled, so a sequence unwinds instead of running
    /// its remaining phases against a view that has gone away.
    private func sleep(_ duration: Duration) async -> Bool {
        do {
            try await Task.sleep(for: duration)
            return true
        } catch {
            return false
        }
    }

    private func reset() {
        sequence = .idle
        rotation = 0
        glow = 0
        shaking = false
        burnStarted = nil
        smokeStarted = nil
    }
}

// MARK: - Parts

/// Four flame shapes flickering out of phase, as the CSS keyframes do.
private struct Flames: View {
    let start: Date

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
            let t = context.date.timeIntervalSince(start)
            Canvas { canvas, size in
                let w = size.width, h = size.height
                let flames: [(x: CGFloat, y: CGFloat, rx: CGFloat, ry: CGFloat, speed: Double, hue: Color)] = [
                    (0.50, 0.20, 0.135, 0.20, 9.0, Color(red: 1, green: 0.85, blue: 0.35)),
                    (0.37, 0.31, 0.085, 0.29, 6.5, Color(red: 1, green: 0.55, blue: 0.10)),
                    (0.63, 0.31, 0.085, 0.29, 7.3, Color(red: 1, green: 0.55, blue: 0.10)),
                    (0.50, 0.50, 0.065, 0.40, 5.1, Color(red: 1, green: 0.30, blue: 0.05)),
                ]
                for (i, f) in flames.enumerated() {
                    let flicker = 0.78 + 0.22 * sin(t * f.speed + Double(i))
                    let rect = CGRect(
                        x: f.x * w - f.rx * w * flicker,
                        y: f.y * h - f.ry * h * flicker,
                        width: f.rx * 2 * w * flicker,
                        height: f.ry * 2 * h * flicker
                    )
                    canvas.fill(
                        Path(ellipseIn: rect),
                        with: .color(f.hue.opacity(0.68 + 0.22 * sin(t * f.speed * 1.3)))
                    )
                }
            }
            .blur(radius: 2)
        }
        .allowsHitTesting(false)
    }
}

/// Five puffs drifting up and to the left, staggered, as `smoke-drift` does.
private struct Smoke: View {
    let start: Date

    private static let puffs: [(x: CGFloat, y: CGFloat, r: CGFloat, delay: Double)] = [
        (0.50, 0.25, 0.075, 0.0),
        (0.37, 0.44, 0.100, 0.2),
        (0.63, 0.50, 0.088, 0.4),
        (0.44, 0.69, 0.113, 0.7),
        (0.60, 0.75, 0.075, 1.0),
    ]

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
            let t = context.date.timeIntervalSince(start)
            Canvas { canvas, size in
                let w = size.width, h = size.height
                for puff in Self.puffs {
                    let elapsed = t - puff.delay
                    guard elapsed > 0 else { continue }
                    // Loops, so a long burn keeps puffing rather than
                    // emitting once and going dry.
                    let p = elapsed.truncatingRemainder(dividingBy: 3.0) / 3.0
                    let scale = 0.5 + p * 2.0
                    let opacity = 0.5 * (1 - p)
                    let cx = puff.x * w - CGFloat(p) * w * 0.25
                    let cy = puff.y * h + CGFloat(p) * h * 0.55
                    let r = puff.r * w * CGFloat(scale)
                    canvas.fill(
                        Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)),
                        with: .color(Color(white: 0.62).opacity(opacity))
                    )
                }
            }
            .blur(radius: 4)
        }
        .allowsHitTesting(false)
    }
}

/// The `reentry-shake` keyframes: a fast, small, irregular jitter.
private struct Shake: ViewModifier {
    let active: Bool
    let amplitude: CGFloat

    func body(content: Content) -> some View {
        if active {
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
                let t = context.date.timeIntervalSinceReferenceDate
                content.offset(
                    // Two incommensurate frequencies so it never visibly repeats.
                    x: amplitude * CGFloat(sin(t * 37)),
                    y: amplitude * CGFloat(cos(t * 43))
                )
            }
        } else {
            content
        }
    }
}
