import SwiftUI

/// The back catalogue — two years of archived batches, newest first.
///
/// "What else have you brewed" is the question every guest asks, and it is
/// currently answered by hand.
struct CatalogueScreen: View {
    @Environment(MenuStore.self) private var store

    let onOpen: (Beer) -> Void

    private let columns = [GridItem(.adaptive(minimum: 360), spacing: 24)]

    var body: some View {
        ScrollView {
            if let archive = store.archive {
                LazyVGrid(columns: columns, spacing: 24) {
                    ForEach(archive.beers, id: \.stableID) { beer in
                        Button { onOpen(beer) } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(beer.name ?? "Untitled")
                                    .font(.headline)
                                    .lineLimit(2)
                                    .minimumScaleFactor(0.5)
                                Text(beer.style ?? "")
                                    .font(.subheadline)
                                    .opacity(0.75)
                                HStack(spacing: 12) {
                                    if let abv = beer.abv {
                                        Text("\(Format.decimal(abv, max: 1))%")
                                    }
                                    if let brewed = beer.brewedOn {
                                        Text(brewed.formatted(.dateTime.month().year()))
                                            .opacity(0.6)
                                    }
                                }
                                .font(.caption)
                            }
                            .foregroundStyle(Palette.ink)
                            .padding(20)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Palette.ink.opacity(0.06))
                            .clipShape(.rect(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(64)
            } else {
                ProgressView().padding(64)
            }
        }
        .navigationTitle("Archived batches")
        .task { await store.loadArchiveIfNeeded() }
    }
}
