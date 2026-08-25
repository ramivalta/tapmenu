import SwiftUI

/// Colour helpers bridging the web menu's values into SwiftUI.
///
/// The server resolves style matching and SRM blending (see
/// `beerStyleColors.ts`), so this file only translates formats: hex strings
/// and the HSL triple the wave tint arrives as.
enum Palette {
    /// The brand teal the web menu uses for all text.
    static let ink = Color(red: 4 / 255, green: 67 / 255, blue: 80 / 255)

    static func hex(_ string: String?) -> Color? {
        guard var value = string else { return nil }
        if value.hasPrefix("#") { value.removeFirst() }
        guard value.count == 6, let rgb = UInt32(value, radix: 16) else { return nil }
        return Color(
            red: Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8) & 0xFF) / 255,
            blue: Double(rgb & 0xFF) / 255
        )
    }

    /// SwiftUI takes HSB; the server sends HSL, so convert properly — the two
    /// diverge badly at the high lightness values the wave tints use.
    static func hsl(_ wave: Beer.WaveColor, opacity: Double = 1) -> Color {
        let s = wave.saturation / 100
        let l = wave.lightness / 100

        let brightness = l + s * min(l, 1 - l)
        let saturation = brightness == 0 ? 0 : 2 * (1 - l / brightness)

        return Color(hue: wave.hue / 360, saturation: saturation, brightness: brightness)
            .opacity(opacity)
    }
}

extension Color {
    /// A hint of another colour, without losing this one's opacity.
    func blended(with other: Color, amount: Double = 0.16) -> Color {
        let resolved = other.opacity(amount)
        return self.mix(with: resolved, by: amount)
    }
}
