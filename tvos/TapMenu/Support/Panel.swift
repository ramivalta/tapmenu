import SwiftUI

/// The translucent panel shared by the menu cards and the detail screen,
/// matching the treatment the web cards use: a white wash the backdrop reads
/// through, a hairline edge and a soft shadow.
enum Surface {
    static let radius: CGFloat = 18
    static let fill = Color.white.opacity(0.45)
    static let stroke = Palette.ink.opacity(0.10)
    static let shadow = Palette.ink.opacity(0.12)
    static let shadowRadius: CGFloat = 16
    static let shadowY: CGFloat = 6

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
                color: Surface.shadow,
                radius: Surface.shadowRadius,
                y: Surface.shadowY
            )
    }
}

extension View {
    func panel() -> some View { modifier(PanelStyle()) }
}
