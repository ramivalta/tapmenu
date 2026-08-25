import CoreGraphics
import Foundation

/// A caustic network, generated once into a texture.
///
/// The previous attempt drew filaments as sine curves along x, which can only
/// ever produce waves — and did. Caustics are not parallel lines: they are a
/// *network*, with closed cells, branches, and bright knots where curves meet.
/// That structure comes from cell boundaries, not from oscillation.
///
/// So this finds the boundaries of a jittered cellular pattern — the set of
/// points roughly equidistant from two neighbouring centres — and brightens
/// them. The input coordinates are warped by fractal noise first, which is
/// what stops the cells looking like a honeycomb and makes the curves wander
/// the way light through moving water does.
///
/// The texture lightens along the ridges and darkens between them, because on
/// a near-white ground the dimming is what makes the pattern legible; pure
/// white light on pale sand is invisible.
enum CausticTexture {
    static let width = 640
    static let height = 360

    /// Cells across the tile. Fewer means a larger, calmer network.
    private static let cells = 7

    // MARK: - Noise

    private static func hash(_ ix: Int, _ iy: Int, _ period: Int, _ seed: Int) -> Double {
        var x = ix % period
        if x < 0 { x += period }
        var y = iy % period
        if y < 0 { y += period }
        var h = UInt64(truncatingIfNeeded: x &* 374_761_393)
        h = h &+ UInt64(truncatingIfNeeded: y &* 668_265_263)
        h = h &+ UInt64(truncatingIfNeeded: seed &* 1_442_695_041)
        h ^= h >> 13
        h = h &* 1_274_126_177
        h ^= h >> 16
        return Double(h % 100_000) / 100_000
    }

    private static func smooth(_ t: Double) -> Double { t * t * (3 - 2 * t) }

    private static func value(_ x: Double, _ y: Double, _ period: Int, _ seed: Int) -> Double {
        let ix = Int(floor(x)), iy = Int(floor(y))
        let fx = x - floor(x), fy = y - floor(y)
        let u = smooth(fx), v = smooth(fy)
        let a = hash(ix, iy, period, seed)
        let b = hash(ix + 1, iy, period, seed)
        let c = hash(ix, iy + 1, period, seed)
        let d = hash(ix + 1, iy + 1, period, seed)
        let top = a + (b - a) * u
        let bottom = c + (d - c) * u
        return top + (bottom - top) * v
    }

    private static func fbm(_ x: Double, _ y: Double, period: Int, seed: Int) -> Double {
        var total = 0.0, amplitude = 1.0, frequency = 1.0, norm = 0.0
        for octave in 0..<3 {
            total += value(
                x * frequency, y * frequency,
                Int(Double(period) * frequency), seed &+ octave &* 91
            ) * amplitude
            norm += amplitude
            amplitude *= 0.5
            frequency *= 2
        }
        return total / norm
    }

    // MARK: - Network

    /// Jittered centre of a cell, wrapped so the texture tiles.
    private static func centre(_ cx: Int, _ cy: Int) -> (x: Double, y: Double) {
        (
            x: Double(cx) + 0.25 + hash(cx, cy, cells, 5) * 0.5,
            y: Double(cy) + 0.25 + hash(cx, cy, cells, 9) * 0.5
        )
    }

    /// RGBA bytes: white along the ridges, ink between them, transparent where
    /// the pattern has nothing to say.
    static func pixels() -> [UInt8] {
        var out = [UInt8](repeating: 0, count: width * height * 4)

        // Brand ink, for the dimming between ridges.
        let ink = (r: 4.0 / 255, g: 67.0 / 255, b: 80.0 / 255)

        for py in 0..<height {
            for px in 0..<width {
                let u = Double(px) / Double(width)
                let v = Double(py) / Double(height)

                // Warp first: without this the cells look like a honeycomb.
                let warpX = fbm(u * 3, v * 3, period: 3, seed: 17) - 0.5
                let warpY = fbm(u * 3 + 5, v * 3 + 5, period: 3, seed: 23) - 0.5
                let x = (u + warpX * 0.30) * Double(cells)
                let y = (v + warpY * 0.30) * Double(cells)

                // Two nearest centres. Their near-equidistant set is the
                // boundary, and boundaries are what a caustic network is.
                var nearest = Double.greatestFiniteMagnitude
                var second = Double.greatestFiniteMagnitude
                let cx = Int(floor(x)), cy = Int(floor(y))
                for oy in -1...1 {
                    for ox in -1...1 {
                        let c = centre(cx + ox, cy + oy)
                        let dx = c.x - x, dy = c.y - y
                        let d = (dx * dx + dy * dy).squareRoot()
                        if d < nearest {
                            second = nearest
                            nearest = d
                        } else if d < second {
                            second = d
                        }
                    }
                }

                // Small where the two are equidistant: on the boundary.
                let edge = second - nearest
                let ridge = max(0, 1 - edge / 0.42)
                let intensity = ridge * ridge * ridge

                let i = (py * width + px) * 4
                if intensity > 0.35 {
                    // Bright core of the filament.
                    let a = min(1, (intensity - 0.35) / 0.65) * 0.26
                    out[i] = UInt8(255 * a)
                    out[i + 1] = UInt8(252 * a)
                    out[i + 2] = UInt8(240 * a)
                    out[i + 3] = UInt8(255 * a)
                } else {
                    // The dimming around it, which is what makes any of this
                    // visible against pale sand. Kept very light: this covers
                    // most of the frame, so even a small alpha here pulls the
                    // whole palette toward ink.
                    let a = (0.35 - intensity) / 0.35 * 0.035
                    out[i] = UInt8(255 * ink.r * a)
                    out[i + 1] = UInt8(255 * ink.g * a)
                    out[i + 2] = UInt8(255 * ink.b * a)
                    out[i + 3] = UInt8(255 * a)
                }
            }
        }
        return out
    }

    static func image(from bytes: [UInt8]) -> CGImage? {
        var data = bytes
        return data.withUnsafeMutableBytes { raw -> CGImage? in
            guard
                let context = CGContext(
                    data: raw.baseAddress,
                    width: width,
                    height: height,
                    bitsPerComponent: 8,
                    bytesPerRow: width * 4,
                    space: CGColorSpaceCreateDeviceRGB(),
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
                )
            else { return nil }
            return context.makeImage()
        }
    }
}
