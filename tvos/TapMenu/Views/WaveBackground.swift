import SwiftUI

/// The drifting wind-wave background, ported from `TapWindBackground.tsx`.
///
/// Three deliberate differences from the web version:
///
/// 1. Geometry is built once per view in a fixed 420×450 space and animated by
///    *translating* it. Rebuilding four filled paths of ~170 points every
///    frame per card is the thing that would make this stutter.
/// 2. The paper grain is dropped. At 92 PPI on a 24" panel those sub-pixel
///    dots alias into shimmer as soon as anything moves.
/// 3. It drifts. The web version is static; a slow horizontal crawl costs
///    almost nothing and stops the ambient screen looking like a screenshot.
struct WaveBackground: View {
    /// Slice dimensions matching the web viewBox, so waves line up across all
    /// four cards as if one continuous field ran behind them.
    private static let sliceWidth: CGFloat = 420
    private static let sliceHeight: CGFloat = 450

    /// One full slice of travel per cycle, so the wrap point is invisible.
    private static let cycle: TimeInterval = 40

    private let tint: Beer.WaveColor
    /// Built in init: cheap enough per view update, far too costly per frame.
    private let basePaths: [Path]

    init(tapIndex: Int, tint: Beer.WaveColor) {
        self.tint = tint
        self.basePaths = Self.buildPaths(tapIndex: tapIndex)
    }

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
            let elapsed = context.date.timeIntervalSinceReferenceDate
            let phase = CGFloat(
                (elapsed / Self.cycle).truncatingRemainder(dividingBy: 1)
            )

            Canvas { canvas, size in
                let scaleX = size.width / Self.sliceWidth
                let scaleY = size.height / Self.sliceHeight
                let travel = phase * Self.sliceWidth

                for (index, base) in basePaths.enumerated() {
                    let color = Palette.hsl(tint, opacity: 0.18 - Double(index) * 0.03)
                    // Drawn twice a slice apart so translation always leaves
                    // geometry covering the visible width.
                    for repetition in 0..<2 {
                        let dx = (CGFloat(repetition) * Self.sliceWidth) - travel
                        let transform = CGAffineTransform(translationX: dx, y: 0)
                            .concatenating(CGAffineTransform(scaleX: scaleX, y: scaleY))
                        canvas.fill(base.applying(transform), with: .color(color))
                    }
                }
            }
        }
        .allowsHitTesting(false)
    }

    // MARK: - Geometry

    /// Same four waves as the web version, seeded identically so the shapes
    /// match what you already see in the browser.
    private static func buildPaths(tapIndex: Int) -> [Path] {
        let totalWidth: CGFloat = sliceWidth * 4  // waves span all four cards
        let offsetX = CGFloat(tapIndex) * sliceWidth

        return (0..<4).map { i in
            let amplitude = 14 + CGFloat(i) * 4
            let frequency = 0.004 + CGFloat(i) * 0.001
            let yOffset = 60 + CGFloat(i) * 95
            let wavePhase = CGFloat(i) * 1.2

            var upper: [CGPoint] = []
            var lower: [CGPoint] = []

            var x = offsetX
            while x <= offsetX + sliceWidth {
                let baseY =
                    yOffset
                    + sin(x * frequency + wavePhase) * amplitude
                    + sin(x * frequency * 1.7 + wavePhase * 2) * (amplitude * 0.4)
                let t = x / totalWidth
                let thickness =
                    (6 + CGFloat(i) * 3) * (0.4 + sin(t * .pi * 2 + wavePhase) * 0.6)

                let px = x - offsetX
                upper.append(CGPoint(x: px, y: baseY - thickness))
                lower.append(CGPoint(x: px, y: baseY + thickness))
                x += 5
            }

            var path = Path()
            guard let first = upper.first else { return path }
            path.move(to: first)
            for point in upper.dropFirst() { path.addLine(to: point) }
            for point in lower.reversed() { path.addLine(to: point) }
            path.closeSubpath()
            return path
        }
    }
}
