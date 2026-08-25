import SwiftUI

/// The four-digit code prompt, shared by putting a beer on a tap and taking
/// one off. Both are the same privileged write, so both ask the same way.
///
/// Nothing here knows the code: `submit` hands it to the server, which checks
/// it and rate-limits attempts, and returns a message to show on failure.
struct CodeEntry: View {
    let title: String
    let subtitle: String?
    /// Returns an error to display, or nil on success.
    let submit: (String) async -> String?
    let cancel: () -> Void

    @State private var code = ""
    @State private var working = false
    @State private var error: String?

    @FocusState private var fieldFocused: Bool

    var body: some View {
        ZStack {
            // Dims what is behind, so the step reads as a halt and nothing
            // underneath can take focus while it is up.
            Color.black.opacity(0.45).ignoresSafeArea()

            VStack(alignment: .leading, spacing: 20) {
                Text(title).font(.title)

                if let subtitle {
                    Text(subtitle).font(.callout).opacity(0.7)
                }

                SecureField("****", text: $code)
                    .keyboardType(.numberPad)
                    .font(.system(size: 44, weight: .bold, design: .monospaced))
                    .frame(maxWidth: 320)
                    .focused($fieldFocused)
                    // The field does not exist when the caller decides to show
                    // this, so focus is claimed once it is actually on screen.
                    .onAppear { fieldFocused = true }
                    .onChange(of: code) { _, new in
                        // Four digits whatever the keyboard offers, and submit
                        // as soon as it is complete — a PIN needs no second
                        // confirmation step.
                        let digits = String(new.filter(\.isNumber).prefix(4))
                        if digits != new {
                            code = digits
                            return
                        }
                        if digits.count == 4, !working {
                            Task { await run(digits) }
                        }
                    }

                if let error {
                    Text(error).font(.callout).foregroundStyle(.red)
                }

                if working {
                    ProgressView()
                } else {
                    Button("Cancel", action: cancel)
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(36)
            .frame(maxWidth: 620, alignment: .leading)
            .panel()
        }
    }

    private func run(_ digits: String) async {
        working = true
        error = nil
        if let message = await submit(digits) {
            error = message
            code = ""
        }
        working = false
    }
}
