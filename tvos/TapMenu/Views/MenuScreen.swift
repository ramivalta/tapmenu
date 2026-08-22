import SwiftUI

/// The ambient screen: what is pouring right now, four across.
///
/// Skeleton styling — the layout and interaction are the point here, not the
/// finish. Focus a card to open the beer.
struct MenuScreen: View {
    @Environment(MenuStore.self) private var store

    let onOpen: (Beer) -> Void
    let onOpenCatalogue: () -> Void

    /// tvOS always focuses *something* on appear, and left to itself it picked
    /// the footer button. A guest picking up the remote should land on a beer.
    @FocusState private var focusedTap: Int?

    var body: some View {
        VStack(spacing: 24) {
            Text("Taproom")
                .font(.largeTitle)
                .foregroundStyle(Palette.ink)

            if let menu = store.menu {
                HStack(spacing: 0) {
                    ForEach(menu.taps) { tap in
                        TapCard(tap: tap, onOpen: onOpen)
                            .focused($focusedTap, equals: tap.tapNumber)
                    }
                }

            } else if store.lastError != nil {
                ContentUnavailableView(
                    "Cannot reach the brewery server",
                    systemImage: "wifi.exclamationmark",
                    description: Text(store.lastError ?? "")
                )
            } else {
                ProgressView()
            }

            Footer(onOpenCatalogue: onOpenCatalogue)
        }
        .padding(48)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.white)
        .task(id: store.isLoaded) {
            guard let menu = store.menu else { return }
            focusedTap = firstPouringTap(in: menu)
        }
    }

    /// Empty taps are not focusable, so default to the first one with a beer.
    private func firstPouringTap(in menu: TapMenu) -> Int? {
        menu.taps.first { $0.beer != nil }?.tapNumber
    }
}

private struct TapCard: View {
    let tap: Tap
    let onOpen: (Beer) -> Void

    var body: some View {
        Button {
            if let beer = tap.beer { onOpen(beer) }
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                Text("TAP \(tap.tapNumber)")
                    .font(.caption)
                    .opacity(0.6)

                if let beer = tap.beer {
                    Text(beer.name ?? "Untitled")
                        // Names run to 47 characters in the catalogue, so
                        // titles must wrap rather than truncate.
                        .font(.title2)
                        .lineLimit(3)
                        .multilineTextAlignment(.leading)

                    Text(beer.style ?? "")
                        .font(.headline)
                        .opacity(0.8)

                    HStack(spacing: 16) {
                        if let abv = beer.abv { Text("\(Format.decimal(abv, max: 1))% ABV") }
                        if let ibu = beer.ibu { Text("\(Format.decimal(ibu, max: 0)) IBU") }
                    }
                    .font(.subheadline)
                    .bold()

                    if let notes = tap.notes {
                        Text(notes).font(.footnote).italic()
                    }

                    Spacer(minLength: 0)

                    if let qr = beer.untappd.flatMap({ QRCodeImage.make(from: $0.qrUrl) }) {
                        qr.resizable().frame(width: 110, height: 110)
                    }
                } else {
                    Text("Currently empty")
                        .font(.title3)
                        .opacity(0.4)
                    Spacer(minLength: 0)
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(20)
            .frame(maxWidth: .infinity, minHeight: 420, alignment: .topLeading)
            .background {
                ZStack {
                    if let beer = tap.beer {
                        WaveBackground(tapIndex: tap.tapNumber - 1, tint: beer.waveColor)
                        // The SRM wash rising from the bottom, as on the web.
                        if let color = Palette.hex(beer.color) {
                            LinearGradient(
                                colors: [.clear, color.opacity(0.16)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        }
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(tap.beer == nil)
    }
}

private struct Footer: View {
    @Environment(MenuStore.self) private var store
    let onOpenCatalogue: () -> Void

    var body: some View {
        HStack(spacing: 24) {
            Button("Archived batches", action: onOpenCatalogue)

            if let updated = store.menu?.updatedAt {
                Text("Updated \(updated.formatted(date: .abbreviated, time: .omitted))")
                    .font(.caption)
                    .opacity(0.5)
            }

            // A refresh can fail without blanking the screen, so say so quietly
            // rather than replacing the menu with an error.
            if store.lastError != nil, store.menu != nil {
                Label("Offline", systemImage: "wifi.slash")
                    .font(.caption)
                    .opacity(0.5)
            }
        }
        .foregroundStyle(Palette.ink)
    }
}
