import SwiftUI

/// A button style that adds nothing at all.
///
/// tvOS's `.plain` style is not plain: it draws the focused card treatment —
/// white fill, rounded corners, scale and drop shadow — and
/// `.focusEffectDisabled()` does not remove it, because the lift comes from
/// the style rather than from a focus effect. Handing back the bare label is
/// the only way to own the focus appearance ourselves.
struct BareButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
    }
}

extension ButtonStyle where Self == BareButtonStyle {
    static var bare: BareButtonStyle { BareButtonStyle() }
}
