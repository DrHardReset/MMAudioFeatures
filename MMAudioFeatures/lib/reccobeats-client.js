'use strict';

class ReccoBeatsClient {
    constructor() {
        this.baseUrl = 'https://api.reccobeats.com';
        this.apiKey = null;
    }

    async _fetchFromApi(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {};
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });
            if (!response.ok) {
                throw new Error(`ReccoBeats API error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('ReccoBeats API error:', error);
            throw new Error(`Failed to fetch from ReccoBeats endpoint '${url}': ${error.message}`);
        }
    }

    async searchArtist(artist) {
        if (!artist) {
            throw new Error('Artist name is required');
        }

        const data = await this._fetchFromApi(`/v1/artist/search?searchText=${encodeURIComponent(artist)}`);

        if (data.content && Array.isArray(data.content)) {
            const foundArtist = data.content.find(a => a.name === artist);

            if (!foundArtist) {
                throw new Error(`Artist '${artist}' not found in ReccoBeats.`);
            }

            return foundArtist;
        }

        throw new Error(`Artist '${artist}' not found in ReccoBeats.`);
    }

    async searchArtistAlbum(artistId, album) {
        if (!artistId || !album) {
            throw new Error('Artist id and album are required');
        }

        let page = 0;
        const size = 50;

        while (true) {
            const data = await this._fetchFromApi(`/v1/artist/${encodeURIComponent(artistId)}/album?page=${page}&size=${size}`);

            if (!data.content || !Array.isArray(data.content)) {
                throw new Error(`Album '${album}' not found for artist ID '${artistId}' in ReccoBeats.`);
            }

            const foundAlbum = data.content.find(a => a.albumTitle === album || a.name === album);

            if (foundAlbum) {
                return foundAlbum;
            }

            if (page >= data.totalPages - 1 || data.content.length < size) {
                break;
            }

            page++;
        }

        throw new Error(`Album '${album}' not found for artist ID '${artistId}' in ReccoBeats.`);
    }

    async searchArtistTrack(artistId, track) {
        if (!artistId || !track) {
            throw new Error('Artist id and track are required');
        }

        let page = 0;
        const size = 50;

        while (true) {
            const data = await this._fetchFromApi(`/v1/artist/${encodeURIComponent(artistId)}/track?page=${page}&size=${size}`);

            if (!data.content || !Array.isArray(data.content)) {
                throw new Error(`Track '${track}' not found for artist ID '${artistId}' in ReccoBeats.`);
            }

            const foundTrack = data.content.find(t => t.trackTitle === track);
            if (foundTrack) {
                return foundTrack;
            }

            if (page >= data.totalPages - 1 || data.content.length < size) {
                break;
            }

            page++;
        }

        throw new Error(`Track '${track}' not found for artist ID '${artistId}' in ReccoBeats.`);
    }

    async getAudioFeaturesByReccoOrSpotifyId(reccoOrSpotifyIds) {
        if (!reccoOrSpotifyIds) {
            throw new Error('ReccoBeats ID or Spotify ID is required');
        }

        // Support both single IDs and arrays
        const ids = Array.isArray(reccoOrSpotifyIds) ? reccoOrSpotifyIds : [reccoOrSpotifyIds];

        if (ids.length === 0) {
            throw new Error('At least one ID is required');
        }

        if (ids.length > 40) {
            throw new Error('Maximum 40 IDs allowed per request');
        }

        const idsParam = ids.join(',');
        const data = await this._fetchFromApi(`/v1/audio-features?ids=${encodeURIComponent(idsParam)}`);

        // For backward compatibility: return first element for single ID
        if (!Array.isArray(reccoOrSpotifyIds)) {
            return data.content && data.content.length > 0 ? data.content[0] : null;
        }

        // For arrays: return all results
        return data.content || [];
    }

    async getAudioFeaturesBatch(reccoOrSpotifyIds) {
        if (!Array.isArray(reccoOrSpotifyIds)) {
            throw new Error('Array of IDs is required for batch processing');
        }

        if (reccoOrSpotifyIds.length === 0) {
            return [];
        }

        const allResults = [];

        // Process in chunks of 40
        for (let i = 0; i < reccoOrSpotifyIds.length; i += 40) {
            const chunk = reccoOrSpotifyIds.slice(i, i + 40);

            try {
                // Use the existing method which handles arrays
                const chunkResults = await this.getAudioFeaturesByReccoOrSpotifyId(chunk);

                // Ensure we maintain the order by creating a result array matching the chunk
                const orderedResults = chunk.map(requestedId => {
                    // Try to find matching result by ID or href
                    const match = chunkResults.find(result =>
                        result && (
                            result.id === requestedId ||
                            (result.href && result.href.includes(requestedId))
                        )
                    );
                    return match || null; // null for not found
                });

                allResults.push(...orderedResults);

            } catch (error) {
                console.error(`Batch chunk error for IDs ${chunk.join(',')}:`, error);
                // Add nulls for failed chunk
                allResults.push(...new Array(chunk.length).fill(null));
            }
        }

        return allResults;
    }

    async getAudioFeatures(reccobeatsId) {
        if (!reccobeatsId) {
            throw new Error('ReccoBeats ID is required');
        }
        return await this._fetchFromApi(`/v1/track/${encodeURIComponent(reccobeatsId)}/audio-features`);
    }
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReccoBeatsClient };
} else {
    // For browser/MediaMonkey environments
    window.ReccoBeatsClient = ReccoBeatsClient;
}