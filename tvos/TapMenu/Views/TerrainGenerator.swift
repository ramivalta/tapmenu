import CoreGraphics
import Foundation

/// Builds the ground as a bitmap, once, from noise.
///
/// The previous version placed rivers, woods and fields independently and let
/// them overlap, which is why it read as shapes rather than as land: real
/// landscape is *consequential*. Water collects in low ground, woodland takes
/// what is too steep or too wet to farm, fields occupy what is left, and every
/// boundary is a contour of the same underlying surface rather than an outline
/// somebody drew.
///
/// So this generates two fractal fields — elevation and wetness — and reads
/// the terrain off them. The shapes that fall out are irregular in the way
/// actual coastlines and woodland edges are, because they are contours rather
/// than blobs.
///
/// Tuned toward Central Finland rather than generic countryside: a great deal
/// of water, conifer forest over most of the land, farmland only in patches
/// near the shores, and — the thing that actually makes it recognisable — a
/// glacial grain running NW–SE, which the lakes and the eskers both follow.
/// Without that grain the shapes have no preferred direction and could be
/// anywhere. It is a likeness of the region's character, not a map of it.
///
/// Rendered once into pixels and then simply translated each frame: a Canvas
/// cannot evaluate a million pixels of noise at 30fps, and it does not need to
/// — the ground does not change, it only moves.
enum TerrainGenerator {
    /// Kept modest deliberately. This runs in a debug build on a 2017 Apple
    /// TV, and the result is seen through haze at low contrast, so detail
    /// beyond this is spent on nothing.
    static let width = 900
    static let height = 506

    // MARK: - Noise

    /// Hashed lattice value, wrapped in both axes so the ground tiles
    /// seamlessly however it scrolls. Flying into the terrain means the seam
    /// would otherwise arrive head-on.
    private static func lattice(
        _ ix: Int, _ iy: Int, _ periodX: Int, _ periodY: Int, _ seed: Int
    ) -> Double {
        var x = ix % max(periodX, 1)
        if x < 0 { x += max(periodX, 1) }
        var y = iy % max(periodY, 1)
        if y < 0 { y += max(periodY, 1) }
        var h = UInt64(truncatingIfNeeded: x &* 374_761_393)
        h = h &+ UInt64(truncatingIfNeeded: y &* 668_265_263)
        h = h &+ UInt64(truncatingIfNeeded: seed &* 1_442_695_041)
        h ^= h >> 13
        h = h &* 1_274_126_177
        h ^= h >> 16
        return Double(h % 100_000) / 100_000
    }

    private static func smooth(_ t: Double) -> Double { t * t * (3 - 2 * t) }

    /// Stretch and shear compound rather than add: at 2 and -2 the result is
    /// about 4:1, which smears the ground into diagonal ribbons. Shear alone
    /// gives roughly 2.2:1 — elongated, still legible as land.
    private static let grainStretch = 1.0
    /// Shear that tilts the grain onto a diagonal. Must be a whole multiple of
    /// `grainStretch`, otherwise the tile stops wrapping: crossing the width
    /// shifts the sample by `cells * shear`, which has to land back on the
    /// lattice.
    private static let grainShear = -1.0

    /// Maps a point in the tile to where the noise is sampled, so that lakes
    /// and ridges run NW–SE as they do across the Finnish Lakeland.
    private static func grained(
        _ u: Double, _ v: Double, cells: Double
    ) -> (x: Double, y: Double) {
        (
            x: u * cells,
            y: v * cells * grainStretch + u * cells * grainShear
        )
    }

    private static func value(
        _ x: Double, _ y: Double, _ periodX: Int, _ periodY: Int, _ seed: Int
    ) -> Double {
        let ix = Int(floor(x)), iy = Int(floor(y))
        let fx = x - floor(x), fy = y - floor(y)
        let u = smooth(fx), v = smooth(fy)

        let a = lattice(ix, iy, periodX, periodY, seed)
        let b = lattice(ix + 1, iy, periodX, periodY, seed)
        let c = lattice(ix, iy + 1, periodX, periodY, seed)
        let d = lattice(ix + 1, iy + 1, periodX, periodY, seed)

        return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v
    }

    /// Fractal noise: octaves at doubling frequency and halving amplitude.
    /// This is what gives natural boundaries their roughness at every scale —
    /// a coastline looks the same kind of wiggly whether you are close or far.
    private static func fbm(
        _ x: Double, _ y: Double, octaves: Int, periodX: Int, periodY: Int, seed: Int
    ) -> Double {
        var total = 0.0
        var amplitude = 1.0
        var frequency = 1.0
        var norm = 0.0

        for octave in 0..<octaves {
            total += value(
                x * frequency, y * frequency,
                Int(Double(periodX) * frequency),
                Int(Double(periodY) * frequency),
                seed &+ octave &* 101
            ) * amplitude
            norm += amplitude
            amplitude *= 0.5
            frequency *= 2
        }
        return total / norm
    }

    // MARK: - Rendering

    private struct Tone {
        let r: Double, g: Double, b: Double
    }

    // Muted enough to sit under a menu; the haze layer softens them further.
    private static let deepWater = Tone(r: 0.58, g: 0.69, b: 0.75)
    private static let shallowWater = Tone(r: 0.70, g: 0.78, b: 0.80)
    private static let shore = Tone(r: 0.86, g: 0.85, b: 0.75)
    private static let pasture = Tone(r: 0.78, g: 0.82, b: 0.64)
    private static let crop = Tone(r: 0.86, g: 0.83, b: 0.62)
    private static let ploughed = Tone(r: 0.80, g: 0.75, b: 0.62)
    private static let forest = Tone(r: 0.62, g: 0.70, b: 0.57)
    private static let deepForest = Tone(r: 0.54, g: 0.63, b: 0.51)
    /// Built-up ground: roofs and hard standing, warmer and greyer than
    /// anything growing.
    private static let urban = Tone(r: 0.86, g: 0.82, b: 0.77)
    private static let street = Tone(r: 0.70, g: 0.68, b: 0.66)

    private static func mix(_ a: Tone, _ b: Tone, _ t: Double) -> Tone {
        Tone(
            r: a.r + (b.r - a.r) * t,
            g: a.g + (b.g - a.g) * t,
            b: a.b + (b.b - a.b) * t
        )
    }

    /// Where the built-up ground goes. A town on a shore is the thing that
    /// makes this Jyväskylä rather than any forest in Finland — the city sits
    /// wrapped around its water. Applied only where the terrain came out as
    /// land, so the settlement finds the shoreline by itself rather than being
    /// drawn over a lake.
    /// `u` and `v` are plain fractions of the tile, corrected to the sampling
    /// space inside the loop — stating them pre-corrected made them almost
    /// impossible to place by eye.
    private static let settlements: [(u: Double, v: Double, radius: Double, weight: Double)] = [
        (0.36, 0.52, 0.17, 1.0),   // the town proper
        (0.68, 0.30, 0.075, 0.6),  // a village across the water
        (0.16, 0.80, 0.055, 0.45), // and a smaller one again
    ]

    /// RGBA bytes. Returned as a plain array so it can be produced off the
    /// main actor — CGImage is not Sendable, so the image itself is built at
    /// the other end.
    static func pixels() -> [UInt8] {
        var out = [UInt8](repeating: 0, count: width * height * 4)

        // Lattice periods: elevation coarse, the rest finer.
        // Lattice periods: elevation coarse, the rest finer. This is the
        // scale that reads as a map — high enough that a field is a patch
        // rather than a region.
        let elevationCells = 6
        let wetnessCells = 9
        let parcelCells = 26

        let aspect = Double(height) / Double(width)

        for py in 0..<height {
            let v = Double(py) / Double(height) * aspect
            for px in 0..<width {
                let u = Double(px) / Double(width)

                let e = grained(u, v, cells: Double(elevationCells))
                let elevation = fbm(
                    e.x, e.y, octaves: 5,
                    periodX: elevationCells,
                    periodY: Int(Double(elevationCells) * grainStretch),
                    seed: 11
                )

                let w = grained(u, v, cells: Double(wetnessCells))
                let wetness = fbm(
                    w.x, w.y, octaves: 4,
                    periodX: wetnessCells,
                    periodY: Int(Double(wetnessCells) * grainStretch),
                    seed: 47
                )

                var tone: Tone
                if elevation < 0.470 {
                    // Lakeland: water takes roughly a quarter of the surface,
                    // and the threshold sitting mid-range is what produces the
                    // long inlets and scattered islands rather than round pools.
                    let depth = min(1, (0.470 - elevation) / 0.10)
                    tone = mix(shallowWater, deepWater, depth)
                } else if elevation < 0.492 {
                    tone = mix(shore, shallowWater, (0.492 - elevation) / 0.022 * 0.55)
                } else if elevation > 0.545 || wetness > 0.46 {
                    // Conifer forest over most of what is not water. In this
                    // part of Finland the farmed ground is the exception.
                    let density = min(1, max(0, (elevation - 0.53) / 0.22 + (wetness - 0.45)))
                    tone = mix(forest, deepForest, density)
                } else {
                    // Farmed ground, divided into parcels by a jittered
                    // lattice. Boundaries wander because the lattice itself is
                    // displaced by noise, so they are never straight for long.
                    let jitterX = fbm(u * 5, v * 5, octaves: 2, periodX: 5, periodY: 5, seed: 71) - 0.5
                    let jitterY = fbm(u * 5 + 3, v * 5 + 3, octaves: 2, periodX: 5, periodY: 5, seed: 73) - 0.5
                    let cellX = Int(floor((u + jitterX * 0.08) * Double(parcelCells)))
                    let cellY = Int(floor((v + jitterY * 0.08) * Double(parcelCells)))
                    let which = lattice(cellX, cellY, parcelCells, parcelCells, 97)

                    tone = which < 0.34 ? pasture : (which < 0.68 ? crop : ploughed)
                    // Fine grain within a field, so it is not a flat plate.
                    let grain = fbm(u * 60, v * 60, octaves: 2, periodX: 60, periodY: 60, seed: 131)
                    tone = mix(tone, pasture, (grain - 0.5) * 0.22)

                    // Darken near a parcel edge: the hedge or ditch line.
                    let fx = (u + jitterX * 0.08) * Double(parcelCells)
                    let fy = (v + jitterY * 0.08) * Double(parcelCells)
                    let edge = min(
                        min(fx - floor(fx), 1 - (fx - floor(fx))),
                        min(fy - floor(fy), 1 - (fy - floor(fy)))
                    )
                    if edge < 0.035 {
                        tone = mix(tone, forest, (1 - edge / 0.035) * 0.45)
                    }
                }

                // Settlement, laid over whatever the land turned out to be.
                for town in settlements {
                    let du = u - town.u
                    let dv = (v / aspect - town.v)
                    let distance = (du * du + dv * dv).squareRoot()
                    guard distance < town.radius, elevation >= 0.470 else { continue }

                    // Denser at the middle, thinning to nothing at the edge —
                    // no town has a hard boundary seen from above.
                    let falloff = 1 - distance / town.radius
                    let density = falloff * falloff * town.weight

                    // Blocks and the gaps between them.
                    let blocks = fbm(
                        u * 90, v * 90, octaves: 2,
                        periodX: 90, periodY: 90, seed: 211
                    )
                    var built = mix(urban, tone, 0.12 + blocks * 0.26)

                    // Streets: two sets of lines at right angles, turned onto
                    // the same diagonal as everything else.
                    let sx = (u * 150 + v * 150).truncatingRemainder(dividingBy: 1)
                    let sy = (v * 150 - u * 150).truncatingRemainder(dividingBy: 1)
                    if min(sx, 1 - sx) < 0.13 || min(sy, 1 - sy) < 0.13 {
                        built = mix(built, street, 0.6)
                    }

                    tone = mix(tone, built, min(1, density * 2.1))
                }

                let i = (py * width + px) * 4
                out[i] = UInt8(max(0, min(255, tone.r * 255)))
                out[i + 1] = UInt8(max(0, min(255, tone.g * 255)))
                out[i + 2] = UInt8(max(0, min(255, tone.b * 255)))
                out[i + 3] = 255
            }
        }
        return out
    }

    /// Builds the image from bytes produced by `pixels()`.
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
