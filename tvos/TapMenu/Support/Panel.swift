import SwiftUI

/// The translucent panel shared by the menu cards and the detail screen,
/// matching the treatment the web cards use: a white wash the backdrop reads
/// through, a hairline edge and a soft shadow.
enum Surface {
    static let radius: CGFloat = 18
    static let fill = Color.white.opacity(0.45)
    static let stroke = Palette.ink.opacity(0.10)
    /// Contact shadow: tight and close, anchoring the panel.
    ///
    /// Neutral rather than brand teal. Tinted shadows read as a colour wash
    /// over the backdrop; a neutral one reads as an absence of light. The web
    /// uses rgba(50,50,50,…) for the same reason.
    static let shadowNear = Color.black.opacity(0.16)
    static let shadowNearRadius: CGFloat = 12
    static let shadowNearY: CGFloat = 8

    /// Cast shadow: wide and far, doing the floating. Scaled from the web
    /// taproom's `0px 36px 72px rgba(50,50,50,0.3)` — CSS blur is roughly
    /// twice SwiftUI's radius.
    static let shadowFar = Color.black.opacity(0.38)
    static let shadowFarRadius: CGFloat = 44
    static let shadowFarY: CGFloat = 34

    static var shape: RoundedRectangle {
        RoundedRectangle(cornerRadius: radius, style: .continuous)
    }
}

private struct PanelStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Surface.fill)
            .clipShape(Surface.shape)
            .overlay { Surface.shape.strokeBorder(Surface.stroke, lineWidth: 1) }
            .shadow(
                color: Surface.shadowNear,
                radius: Surface.shadowNearRadius,
                y: Surface.shadowNearY
            )
            .shadow(
                color: Surface.shadowFar,
                radius: Surface.shadowFarRadius,
                y: Surface.shadowFarY
            )
    }
}

extension View {
    func panel() -> some View { modifier(PanelStyle()) }
}
