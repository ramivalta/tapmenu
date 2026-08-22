import Foundation

/// Number formatting for display.
///
/// Everything goes through here so the same value never appears two ways: the
/// menu and the detail screen previously disagreed on whether 7.7% ABV reads
/// "7,7%" or "7.7%". Locale-aware wins — this is a Finnish taproom.
enum Format {
    /// Trailing zeros are dropped, so 4 kg stays "4 kg" while 0.5 kg stays
    /// "0,5 kg" instead of rounding away to "0 kg".
    static func decimal(_ value: Double, max: Int) -> String {
        value.formatted(.number.precision(.fractionLength(0...max)))
    }
}
