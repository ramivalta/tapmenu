import SwiftUI

/// Choosing a beer for an empty tap, from the taproom rather than a laptop.
///
/// Two steps: pick a completed batch, then enter the four-digit code. The code
/// is checked by the server, which also rate-limits attempts — nothing here
/// knows it, so nothing here can leak it.
struct AssignBeerScreen: View {
    @Environment(MenuStore.self) private var store

    let tapNumber: Int
    let onDone: () -> Void

    @State private var batches: [AssignableBatch] = []
    @State private var loadError: String?
    @State private var chosen: AssignableBatch?
    @State private var code = ""
    @State private var saving = false
    @State private var saveError: String?

    @FocusState private var codeFieldFocused: Bool

    private let columns = [GridItem(.adaptive(minimum: 380), spacing: 24)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                header

                if let chosen {
                    codeEntry(for: chosen)
                } else if let loadError {
                    Text(loadError)
                        .font(.headline)
                        .opacity(0.7)
                        .padding(24)
                        .panel()
                } else if batches.isEmpty {
                    ProgressView().padding(24)
                } else {
                    picker
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(56)
        }
        .task {
            do {
                batches = try await MenuAPI.batches().batches
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Tap \(tapNumber)")
                .font(.caption)
                .tracking(2)
                .opacity(0.55)
            Text(chosen == nil ? "Choose a beer" : "Enter the code to confirm")
                .font(.largeTitle)
        }
    }

    // MARK: - Picking

    private var picker: some View {
        LazyVGrid(columns: columns, spacing: 24) {
            ForEach(batches) { batch in
                Button {
                    chosen = batch
                    code = ""
                    saveError = nil
                    codeFieldFocused = true
                } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(batch.name)
                            .font(.title3)
                            .lineLimit(2)
                            .minimumScaleFactor(0.6)
                            .multilineTextAlignment(.leading)

                        if let style = batch.style {
                            Text(style).font(.subheadline).opacity(0.75)
                        }

                        HStack(spacing: 12) {
                            if let abv = batch.abv {
                                Text("\(Format.decimal(abv, max: 1))% ABV")
                            }
                            if let ibu = batch.ibu {
                                Text("\(Format.decimal(ibu, max: 0)) IBU")
                            }
                        }
                        .font(.footnote)
                        .bold()

                        // Already pouring elsewhere; still selectable, since
                        // moving a keg between taps is a real thing to do.
                        if let onTap = batch.onTap {
                            Text("On tap \(onTap)")
                                .font(.caption)
                                .opacity(0.6)
                        }
                    }
                    .foregroundStyle(Palette.ink)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(24)
                    .panel()
                }
                .buttonStyle(.bare)
            }
        }
    }

    // MARK: - Confirming

    private func codeEntry(for batch: AssignableBatch) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            Text(batch.name)
                .font(.title2)
                .lineLimit(2)
                .minimumScaleFactor(0.6)

            SecureField("****", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.password)
                .font(.system(size: 44, weight: .bold, design: .monospaced))
                .frame(maxWidth: 320)
                .focused($codeFieldFocused)
                .onChange(of: code) { _, new in
                    // Keep it to four digits whatever the keyboard offers.
                    let digits = new.filter(\.isNumber).prefix(4)
                    if digits != new { code = String(digits) }
                }

            if let saveError {
                Text(saveError)
                    .font(.callout)
                    .foregroundStyle(.red)
            }

            HStack(spacing: 20) {
                Button("Save") { Task { await save(batch) } }
                    .buttonStyle(.bordered)
                    .disabled(code.count != 4 || saving)

                Button("Choose a different beer") {
                    chosen = nil
                    saveError = nil
                }
                .buttonStyle(.bordered)
                .disabled(saving)
            }

            if saving {
                ProgressView()
            }
        }
        .padding(28)
        .frame(maxWidth: .infinity, alignment: .leading)
        .panel()
    }

    private func save(_ batch: AssignableBatch) async {
        saving = true
        saveError = nil
        do {
            try await MenuAPI.assign(tap: tapNumber, batchId: batch.id, code: code)
            // Pull the menu straight away rather than waiting for the poll, so
            // the beer is on screen by the time the display comes back.
            await store.refresh()
            onDone()
        } catch {
            saveError = error.localizedDescription
            code = ""
        }
        saving = false
    }
}
