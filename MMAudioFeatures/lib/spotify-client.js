'use strict';

// Image object used across various Spotify entities
class SpotifyImage {
    constructor(data) {
        this.url = data.url;
        this.height = data.height;
        this.width = data.width;
    }
}

// External URLs object
class ExternalUrls {
    constructor(data) {
        this.spotify = data.spotify;
    }
}

// External IDs object for tracks
class ExternalIds {
    constructor(data) {
        this.isrc = data.isrc;
        this.ean = data.ean;
        this.upc = data.upc;
    }
}

// Simplified Artist object (used in albums, tracks)
class SpotifyArtist {
    constructor(data) {
        this.external_urls = data.external_urls ? new ExternalUrls(data.external_urls) : null;
        this.href = data.href;
        this.id = data.id;
        this.name = data.name;
        this.type = data.type;
        this.uri = data.uri;
        // Full artist object additional properties
        this.followers = data.followers;
        this.genres = data.genres || [];
        this.images = data.images ? data.images.map(img => new SpotifyImage(img)) : [];
        this.popularity = data.popularity;
    }
}

// Album object (both full and simplified)
class SpotifyAlbum {
    constructor(data) {
        this.album_type = data.album_type;
        this.total_tracks = data.total_tracks;
        this.available_markets = data.available_markets || [];
        this.external_urls = data.external_urls ? new ExternalUrls(data.external_urls) : null;
        this.href = data.href;
        this.id = data.id;
        this.images = data.images ? data.images.map(img => new SpotifyImage(img)) : [];
        this.name = data.name;
        this.release_date = data.release_date;
        this.release_date_precision = data.release_date_precision;
        this.restrictions = data.restrictions;
        this.type = data.type;
        this.uri = data.uri;
        this.artists = data.artists ? data.artists.map(artist => new SpotifyArtist(artist)) : [];
    }
}

// Track object
class SpotifyTrack {
    constructor(data) {
        this.album = data.album ? new SpotifyAlbum(data.album) : null;
        this.artists = data.artists ? data.artists.map(artist => new SpotifyArtist(artist)) : [];
        this.available_markets = data.available_markets || [];
        this.disc_number = data.disc_number;
        this.duration_ms = data.duration_ms;
        this.explicit = data.explicit;
        this.external_ids = data.external_ids ? new ExternalIds(data.external_ids) : null;
        this.external_urls = data.external_urls ? new ExternalUrls(data.external_urls) : null;
        this.href = data.href;
        this.id = data.id;
        this.is_playable = data.is_playable;
        this.linked_from = data.linked_from;
        this.restrictions = data.restrictions;
        this.name = data.name;
        this.popularity = data.popularity;
        this.preview_url = data.preview_url;
        this.track_number = data.track_number;
        this.type = data.type;
        this.uri = data.uri;
        this.is_local = data.is_local;
    }
}

// Pagination object for search results
class SpotifyPaging {
    constructor(data, ItemClass) {
        this.href = data.href;
        this.limit = data.limit;
        this.next = data.next;
        this.offset = data.offset;
        this.previous = data.previous;
        this.total = data.total;
        this.items = data.items ? data.items.map(item => new ItemClass(item)) : [];
    }
}

// Search response object
class SpotifySearchResponse {
    constructor(data) {
        this.tracks = data.tracks ? new SpotifyPaging(data.tracks, SpotifyTrack) : null;
        this.artists = data.artists ? new SpotifyPaging(data.artists, SpotifyArtist) : null;
        this.albums = data.albums ? new SpotifyPaging(data.albums, SpotifyAlbum) : null;
        this.playlists = data.playlists ? new SpotifyPaging(data.playlists, Object) : null; // Simplified for now
        this.shows = data.shows ? new SpotifyPaging(data.shows, Object) : null; // Simplified for now
        this.episodes = data.episodes ? new SpotifyPaging(data.episodes, Object) : null; // Simplified for now
        this.audiobooks = data.audiobooks ? new SpotifyPaging(data.audiobooks, Object) : null; // Simplified for now
    }
}

// Authentication response
class SpotifyAuthResponse {
    constructor(data) {
        this.access_token = data.access_token;
        this.token_type = data.token_type;
        this.expires_in = data.expires_in;
        this.scope = data.scope;
    }
}

class SpotifyClient {
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        this.webUrl = 'https://open.spotify.com';
    }

    /**
     * Authenticate with Spotify using Client Credentials flow.
     *
     * @returns {Promise<SpotifyAuthResponse>} Authentication response with access token
     * @throws {Error} When authentication fails
     */
    async authenticate() {
        const now = Date.now();
        if (this.accessToken && now < this.tokenExpiresAt) {
            return new SpotifyAuthResponse({ access_token: this.accessToken });
        }

        const credentials = btoa(`${this.clientId}:${this.clientSecret}`);

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const data = await response.json();
            const authResponse = new SpotifyAuthResponse(data);
            this.accessToken = authResponse.access_token;
            this.tokenExpiresAt = now + authResponse.expires_in * 1000;
            return authResponse;
        } catch (error) {
            throw new Error(`Spotify authentication error: ${error.message}`);
        }
    }

    /**
     * Search for tracks using artist, track name, and optional album.
     *
     * @param {string} artist - Artist name
     * @param {string} track - Track name
     * @param {string|null} [album=null] - Optional album name
     * @param {Object} [options={}] - Search options
     * @param {number} [options.limit=20] - Maximum number of results (1-50)
     * @param {string} [options.market='DE'] - Market/country code
     * @returns {Promise<SpotifySearchResponse>} Search results with structured objects
     * @throws {Error} When search fails or parameters are invalid
     *
     * @example
     * const results = await client.searchTracks('The Weeknd', 'Blinding Lights');
     * console.log(results.tracks.items[0].name); // 'Blinding Lights'
     * console.log(results.tracks.items[0].artists[0].name); // 'The Weeknd'
     */
    async searchTracks(artist, track, album = null, options = {}) {
        if (!this.accessToken) {
            await this.authenticate();
        }

        let query = '';
        if (artist && track) {
            query = `artist:${artist} track:${track}`;
        } else if (artist) {
            query = `artist:${artist}`;
        } else if (track) {
            query = `track:${track}`;
        } else {
            throw new Error('Artist or track must be specified.');
        }

        if (album) {
            query += ` album:${album}`;
        }

        const limit = options.limit || 20;
        const market = options.market || 'DE';

        try {
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=${market}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();
            return new SpotifySearchResponse(data);
        } catch (error) {
            throw new Error(`Spotify search error: ${error.message}`);
        }
    }

    /**
     * Generates a Spotify track URL from a track ID.
     *
     * @param {string} trackId - The Spotify track ID
     * @returns {string} The complete Spotify track URL
     * @throws {Error} When track ID is missing
     *
     * @example
     * const url = client.getTrackUrl('6Gf7assZMey5UGOhYTBaaU');
     * // Returns: 'https://open.spotify.com/track/6Gf7assZMey5UGOhYTBaaU'
     */
    getTrackUrl(trackId) {
        if (!trackId) {
            throw new Error('Track ID is required');
        }
        return `${this.webUrl}/track/${trackId}`;
    }
}

// For MediaMonkey compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SpotifyClient,
        SpotifySearchResponse,
        SpotifyTrack,
        SpotifyAlbum,
        SpotifyArtist,
        SpotifyImage,
        SpotifyPaging,
        SpotifyAuthResponse,
        ExternalUrls,
        ExternalIds
    };
} else {
    // Browser/MediaMonkey environment
    window.SpotifyClient = SpotifyClient;
    window.SpotifySearchResponse = SpotifySearchResponse;
    window.SpotifyTrack = SpotifyTrack;
    window.SpotifyAlbum = SpotifyAlbum;
    window.SpotifyArtist = SpotifyArtist;
    window.SpotifyImage = SpotifyImage;
    window.SpotifyPaging = SpotifyPaging;
    window.SpotifyAuthResponse = SpotifyAuthResponse;
    window.ExternalUrls = ExternalUrls;
    window.ExternalIds = ExternalIds;
}