'use strict';

const {
    SpotifyClient,
    SpotifySearchResponse,
    SpotifyTrack,
    SpotifyArtist,
    SpotifyAlbum,
    SpotifyAuthResponse
} = require('../../lib/spotify-client');

// Mock fetch globally
global.fetch = jest.fn();
global.btoa = jest.fn();

describe('SpotifyClient', () => {
    let spotifyClient;

    beforeEach(() => {
        spotifyClient = new SpotifyClient('test-client-id', 'test-client-secret');
        jest.clearAllMocks();
        global.btoa.mockReturnValue('dGVzdC1jbGllbnQtaWQ6dGVzdC1jbGllbnQtc2VjcmV0');
    });

    describe('constructor', () => {
        test('should initialize with client credentials', () => {
            expect(spotifyClient.clientId).toBe('test-client-id');
            expect(spotifyClient.clientSecret).toBe('test-client-secret');
            expect(spotifyClient.accessToken).toBeNull();
        });
    });

    describe('authenticate', () => {
        test('should successfully authenticate and return SpotifyAuthResponse', async () => {
            const mockTokenResponse = {
                access_token: 'test-access-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTokenResponse)
            });

            const result = await spotifyClient.authenticate();

            expect(global.fetch).toHaveBeenCalledWith('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic dGVzdC1jbGllbnQtaWQ6dGVzdC1jbGllbnQtc2VjcmV0',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });

            expect(spotifyClient.accessToken).toBe('test-access-token');

            // Test that result is a SpotifyAuthResponse instance
            expect(result).toBeInstanceOf(SpotifyAuthResponse);
            expect(result.access_token).toBe('test-access-token');
            expect(result.token_type).toBe('Bearer');
            expect(result.expires_in).toBe(3600);
        });

        test('should return existing token as SpotifyAuthResponse if already authenticated', async () => {
            spotifyClient.accessToken = 'existing-token';
            spotifyClient.tokenExpiresAt = Date.now() + 3600000;

            const result = await spotifyClient.authenticate();

            expect(global.fetch).not.toHaveBeenCalled();
            expect(result).toBeInstanceOf(SpotifyAuthResponse);
            expect(result.access_token).toBe('existing-token');
        });

        test('should reject on authentication error', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401
            });

            await expect(spotifyClient.authenticate()).rejects.toThrow('Authentication failed: 401');
        });

        test('should reject on network error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(spotifyClient.authenticate()).rejects.toThrow('Spotify authentication error: Network error');
        });
    });

    describe('searchTracks', () => {
        beforeEach(() => {
            spotifyClient.accessToken = 'test-access-token';
        });

        test('should authenticate if no access token', async () => {
            spotifyClient.accessToken = null;

            const mockTokenResponse = {
                access_token: 'new-access-token',
                token_type: 'Bearer',
                expires_in: 3600
            };

            const mockSearchResponse = {
                tracks: {
                    items: [],
                    href: 'test-href',
                    limit: 20,
                    next: null,
                    offset: 0,
                    previous: null,
                    total: 0
                }
            };

            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockTokenResponse)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockSearchResponse)
                });

            const result = await spotifyClient.searchTracks('artist', 'track');

            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(spotifyClient.accessToken).toBe('new-access-token');
            expect(result).toBeInstanceOf(SpotifySearchResponse);
        });

        test('should build correct query and return SpotifySearchResponse', async () => {
            const mockSearchResponse = {
                tracks: {
                    href: 'test-href',
                    limit: 20,
                    next: null,
                    offset: 0,
                    previous: null,
                    total: 1,
                    items: [
                        {
                            id: 'track-id',
                            name: 'Test Track',
                            artists: [{
                                id: 'artist-id',
                                name: 'Test Artist',
                                href: 'artist-href',
                                type: 'artist',
                                uri: 'spotify:artist:artist-id'
                            }],
                            album: {
                                id: 'album-id',
                                name: 'Test Album',
                                album_type: 'album',
                                total_tracks: 10,
                                available_markets: ['DE'],
                                external_urls: { spotify: 'https://open.spotify.com/album/album-id' },
                                href: 'album-href',
                                images: [],
                                release_date: '2023-01-01',
                                release_date_precision: 'day',
                                type: 'album',
                                uri: 'spotify:album:album-id',
                                artists: []
                            },
                            duration_ms: 180000,
                            explicit: false,
                            external_urls: { spotify: 'https://open.spotify.com/track/track-id' },
                            href: 'track-href',
                            popularity: 85,
                            type: 'track',
                            uri: 'spotify:track:track-id'
                        }
                    ]
                }
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            const result = await spotifyClient.searchTracks('Test Artist', 'Test Track');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=artist%3ATest%20Artist%20track%3ATest%20Track&type=track&limit=20&market=DE',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );

            // Test that result is a SpotifySearchResponse with structured objects
            expect(result).toBeInstanceOf(SpotifySearchResponse);
            expect(result.tracks).toBeDefined();
            expect(result.tracks.items).toHaveLength(1);
            expect(result.tracks.items[0]).toBeInstanceOf(SpotifyTrack);
            expect(result.tracks.items[0].name).toBe('Test Track');
            expect(result.tracks.items[0].artists[0]).toBeInstanceOf(SpotifyArtist);
            expect(result.tracks.items[0].artists[0].name).toBe('Test Artist');
            expect(result.tracks.items[0].album).toBeInstanceOf(SpotifyAlbum);
            expect(result.tracks.items[0].album.name).toBe('Test Album');
        });

        test('should include album in query when provided', async () => {
            const mockSearchResponse = {
                tracks: {
                    items: [],
                    href: 'test-href',
                    limit: 20,
                    next: null,
                    offset: 0,
                    previous: null,
                    total: 0
                }
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            const result = await spotifyClient.searchTracks('Artist', 'Track', 'Test Album');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=artist%3AArtist%20track%3ATrack%20album%3ATest%20Album&type=track&limit=20&market=DE',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );

            expect(result).toBeInstanceOf(SpotifySearchResponse);
        });

        test('should handle search with only artist', async () => {
            const mockSearchResponse = {
                tracks: {
                    items: [],
                    href: 'test-href',
                    limit: 20,
                    next: null,
                    offset: 0,
                    previous: null,
                    total: 0
                }
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            const result = await spotifyClient.searchTracks('Test Artist', '');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=artist%3ATest%20Artist&type=track&limit=20&market=DE',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );

            expect(result).toBeInstanceOf(SpotifySearchResponse);
        });

        test('should handle search with only track', async () => {
            const mockSearchResponse = {
                tracks: {
                    items: [],
                    href: 'test-href',
                    limit: 20,
                    next: null,
                    offset: 0,
                    previous: null,
                    total: 0
                }
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            const result = await spotifyClient.searchTracks('', 'Test Track');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=track%3ATest%20Track&type=track&limit=20&market=DE',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );

            expect(result).toBeInstanceOf(SpotifySearchResponse);
        });

        test('should throw error when neither artist nor track provided', async () => {
            await expect(spotifyClient.searchTracks('', '')).rejects.toThrow('Artist or track must be specified');
        });

        test('should reject on search error', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 400
            });

            await expect(spotifyClient.searchTracks('Artist', 'Track')).rejects.toThrow('Search failed: 400');
        });

        test('should respect custom options', async () => {
            const mockSearchResponse = {
                tracks: {
                    items: [],
                    href: 'test-href',
                    limit: 10,
                    next: null,
                    offset: 0,
                    previous: null,
                    total: 0
                }
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
            });

            const result = await spotifyClient.searchTracks('Artist', 'Track', null, { limit: 10, market: 'US' });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.spotify.com/v1/search?q=artist%3AArtist%20track%3ATrack&type=track&limit=10&market=US',
                {
                    headers: {
                        'Authorization': 'Bearer test-access-token'
                    }
                }
            );

            expect(result).toBeInstanceOf(SpotifySearchResponse);
        });
    });

    afterAll(() => {
        console.log('🏁 Spotify Client Test completed');
    });
});