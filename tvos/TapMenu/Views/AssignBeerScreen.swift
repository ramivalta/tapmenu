import SwiftUI

/// Choosing a beer for an empty tap, from the taproom rather than a laptop.
///
/// Pick a beer, press Save, then enter the four-digit code. The code is
/// checked by the server, which also rate-limits attempts — nothing here knows
/// it, so nothing here can leak it.
struct AssignBeerScreen: View {
    @Environment(MenuStore.self) private var store

    let tapNumber: Int
    let onDone: () -> Void

    @State private var batches: [AssignableBatch] = []
    @State private var loadError: String?
    @State private var chosen: AssignableBatch?
    @State private var askingForCode = false
    @State private var saveError: String?

    /// tvOS focuses something when a view appears, but at that moment this
    /// screen is still a spinner — nothing focusable exists yet. When the
    /// batches arrive the focus engine does not go back for them, so focus is
    /// claimed explicitly once there is something to claim.
    @FocusState private var focusedBatch: String?

    private let columns = [GridItem(.adaptive(minimum: 380), spacing: 24)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                header

                if let loadError {
                    Text(loadError)
                        .font(.headline)
                        .opacity(0.7)
                        .padding(24)
                        .panel()
                } else if batches.isEmpty {
                    ProgressView().padding(24)
                } else {
                    picker
                    saveBar
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(56)
        }
        .overlay {
            if askingForCode {
                CodeEntry(
                    title: "Enter the code",
                    subtitle: chosen.map { "\($0.name) → tap \(tapNumber)" },
                    submit: { await save($0) },
                    cancel: { askingForCode = false }
                )
            }
        }
        .task {
            do {
                batches = try await MenuAPI.batches().batches
                focusedBatch = batches.first?.id
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
            Text("Choose a beer")
                .font(.largeTitle)
        }
    }

    // MARK: - Picking

    private var picker: some View {
        LazyVGrid(columns: columns, spacing: 24) {
            ForEach(batches) { batch in
                let focused = focusedBatch == batch.id
                let selected = chosen?.id == batch.id

                Button {
                    chosen = batch
                    saveError = nil
                } label: {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(alignment: .top) {
                            Text(batch.name)
                                .font(.title3)
                                .lineLimit(2)
                                .minimumScaleFactor(0.6)
                                .multilineTextAlignment(.leading)

                            Spacer(minLength: 8)

                            // Chosen and focused are different things: focus
                            // moves as you browse, the tick stays put.
                            Image(systemName: "checkmark.circle.fill")
                                .opacity(selected ? 1 : 0)
                        }

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
                    .background(Color.white.opacity(focused ? 0.92 : 0.45))
                    .clipShape(Surface.shape)
                    .overlay {
                        Surface.shape.strokeBorder(
                            focused
                                ? Palette.ink.opacity(0.45)
                                : (selected ? Palette.ink.opacity(0.30) : Surface.stroke),
                            lineWidth: focused ? 3 : (selected ? 2 : 1)
                        )
                    }
                    .shadow(
                        color: .black.opacity(focused ? 0.22 : 0.16),
                        radius: focused ? 18 : Surface.shadowNearRadius,
                        y: focused ? 12 : Surface.shadowNearY
                    )
                    .shadow(
                        color: .black.opacity(focused ? 0.50 : 0.38),
                        radius: focused ? 60 : Surface.shadowFarRadius,
                        y: focused ? 42 : Surface.shadowFarY
                    )
                    // Unlike the ambient menu, this screen exists to be
                    // navigated, so focus is always shown and shown loudly.
                    .scaleEffect(focused ? 1.05 : 1)
                    .animation(.easeOut(duration: 0.18), value: focused)
                }
                .buttonStyle(.bare)
                .focused($focusedBatch, equals: batch.id)
            }
        }
        // So the grid can be entered from anywhere rather than only from
        // whatever happens to sit directly above a given card.
        .focusSection()
    }

    private var saveBar: some View {
        HStack(spacing: 20) {
            Button(chosen == nil ? "Choose a beer first" : "Save to tap \(tapNumber)") {
                saveError = nil
                askingForCode = true
            }
            .disabled(chosen == nil)

            if let chosen {
                Text(chosen.name)
                    .font(.callout)
                    .opacity(0.7)
                    .lineLimit(1)
            }

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity)
        .focusSection()
    }

    // MARK: - Confirming

    /// Returns an error to show, or nil once saved.
    private func save(_ code: String) async -> String? {
        guard let batch = chosen else { return "No beer chosen" }
        do {
            try await MenuAPI.assign(tap: tapNumber, batchId: batch.id, code: code)
            // Pull the menu straight away rather than waiting for the poll, so
            // the beer is on screen by the time the display comes back.
            await store.refresh()
            onDone()
            return nil
        } catch {
            return error.localizedDescription
        }
    }
}
