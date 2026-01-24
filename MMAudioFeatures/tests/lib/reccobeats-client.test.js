'use strict';

const { ReccoBeatsClient } = require('../../lib/reccobeats-client');

// Mock fetch globally - BEFORE any imports
global.fetch = jest.fn();

// Mock console.error to suppress error logs during tests
console.error = jest.fn();

describe('ReccoBeatsClient', () => {
    let reccobeatsClient;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Create a new client instance
        reccobeatsClient = new ReccoBeatsClient();

        // Reset fetch mock
        global.fetch.mockReset();
    });

    describe('constructor', () => {
        test('should initialize with default baseUrl', () => {
            const client = new ReccoBeatsClient();
            expect(client.baseUrl).toBe('https://api.reccobeats.com');
            expect(client.apiKey).toBeNull();
        });
    });

    describe('getAudioFeatures', () => {
        test('should throw error for missing ID', async () => {
            await expect(reccobeatsClient.getAudioFeatures('')).rejects.toThrow('ReccoBeats ID is required');
        });

        test('should fetch audio features successfully', async () => {
            const mockFeatures = {
                id: 'recco-123',
                tempo: 120,
                energy: 0.8,
                danceability: 0.7
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce(mockFeatures)
            });

            const result = await reccobeatsClient.getAudioFeatures('recco-123');

            expect(global.fetch).toHaveBeenCalledWith('https://api.reccobeats.com/v1/track/recco-123/audio-features', {
                method: 'GET',
                headers: {}
            });

            expect(result).toEqual(mockFeatures);
        });

        test('should handle API errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            await expect(reccobeatsClient.getAudioFeatures('notfound-id'))
                .rejects.toThrow("Failed to fetch from ReccoBeats endpoint 'https://api.reccobeats.com/v1/track/notfound-id/audio-features': ReccoBeats API error: 404 Not Found");
        });

        test('should handle network errors', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(reccobeatsClient.getAudioFeatures('recco-123'))
                .rejects.toThrow("Failed to fetch from ReccoBeats endpoint 'https://api.reccobeats.com/v1/track/recco-123/audio-features': Network error");
        });
    });

    describe('getAudioFeaturesByReccoOrSpotifyIds', () => {
        test('should throw error for non-array input', async () => {
            await expect(reccobeatsClient.getAudioFeaturesByReccoOrSpotifyIds('single-id')).rejects.toThrow('Array of IDs is required');
        });

        test('should return empty array for empty input', async () => {
            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyIds([]);
            expect(result).toEqual([]);
        });

        test('should fetch audio features for single ID', async () => {
            const mockFeatures = {
                id: 'recco-123',
                tempo: 120,
                energy: 0.8,
                danceability: 0.7
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({ content: [mockFeatures] })
            });

            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyIds(['recco-123']);

            expect(global.fetch).toHaveBeenCalledWith('https://api.reccobeats.com/v1/audio-features?ids=recco-123', {
                method: 'GET',
                headers: {}
            });

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('recco-123');
            expect(result[0].tempo).toBe(120);
        });

        test('should fetch audio features for multiple IDs', async () => {
            const mockFeatures = [
                { id: 'recco-1', tempo: 120, energy: 0.8, danceability: 0.7 },
                { id: 'spotify-2', tempo: 128, energy: 0.9, danceability: 0.75 },
                { id: 'recco-3', tempo: 140, energy: 0.85, danceability: 0.8 }
            ];

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({ content: mockFeatures })
            });

            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyIds(['recco-1', 'spotify-2', 'recco-3']);

            expect(global.fetch).toHaveBeenCalledWith('https://api.reccobeats.com/v1/audio-features?ids=recco-1%2Cspotify-2%2Crecco-3', {
                method: 'GET',
                headers: {}
            });

            expect(result).toHaveLength(3);
            expect(result[0].id).toBe('recco-1');
            expect(result[1].id).toBe('spotify-2');
            expect(result[2].id).toBe('recco-3');
        });

        test('should handle chunking for more than 40 IDs', async () => {
            // Create 45 mock IDs
            const ids = Array.from({ length: 45 }, (_, i) => `id-${i + 1}`);

            // Mock first chunk (40 items)
            const mockChunk1 = Array.from({ length: 40 }, (_, i) => ({
                id: `id-${i + 1}`,
                tempo: 120 + i,
                energy: 0.8,
                danceability: 0.7
            }));

            // Mock second chunk (5 items)
            const mockChunk2 = Array.from({ length: 5 }, (_, i) => ({
                id: `id-${i + 41}`,
                tempo: 160 + i,
                energy: 0.8,
                danceability: 0.7
            }));

            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValueOnce({ content: mockChunk1 })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValueOnce({ content: mockChunk2 })
                });

            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyIds(ids);

            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(result).toHaveLength(45);
            expect(result[0].id).toBe('id-1');
            expect(result[39].id).toBe('id-40');
            expect(result[40].id).toBe('id-41');
            expect(result[44].id).toBe('id-45');
        });

        test('should return null for not found IDs', async () => {
            const mockFeatures = [
                { id: 'recco-1', tempo: 120, energy: 0.8, danceability: 0.7 },
                // recco-2 not found
                { id: 'recco-3', tempo: 140, energy: 0.85, danceability: 0.8 }
            ];

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({ content: mockFeatures })
            });

            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyIds(['recco-1', 'recco-2', 'recco-3']);

            expect(result).toHaveLength(3);
            expect(result[0].id).toBe('recco-1');
            expect(result[1]).toBeNull(); // Not found
            expect(result[2].id).toBe('recco-3');
        });

        test('should maintain order even with mismatched API response order', async () => {
            // API returns in different order than requested
            const mockFeatures = [
                { id: 'recco-3', tempo: 140, energy: 0.85, danceability: 0.8 },
                { id: 'recco-1', tempo: 120, energy: 0.8, danceability: 0.7 },
                { id: 'recco-2', tempo: 128, energy: 0.9, danceability: 0.75 }
            ];

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({ content: mockFeatures })
            });

            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyIds(['recco-1', 'recco-2', 'recco-3']);

            expect(result).toHaveLength(3);
            expect(result[0].id).toBe('recco-1'); // Correct order maintained
            expect(result[1].id).toBe('recco-2');
            expect(result[2].id).toBe('recco-3');
        });

        test('should handle chunk errors gracefully', async () => {
            const ids = Array.from({ length: 45 }, (_, i) => `id-${i + 1}`);

            const mockChunk1 = Array.from({ length: 40 }, (_, i) => ({
                id: `id-${i + 1}`,
                tempo: 120 + i,
                energy: 0.8,
                danceability: 0.7
            }));

            // First chunk succeeds, second chunk fails
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValueOnce({ content: mockChunk1 })
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error'
                });

            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyIds(ids);

            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(result).toHaveLength(45);

            // First 40 should have data
            expect(result[0].id).toBe('id-1');
            expect(result[39].id).toBe('id-40');

            // Last 5 should be null due to error
            expect(result[40]).toBeNull();
            expect(result[44]).toBeNull();
        });

        test('should handle network errors gracefully', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyIds(['id-1', 'id-2']);

            expect(result).toHaveLength(2);
            expect(result[0]).toBeNull();
            expect(result[1]).toBeNull();
        });

        test('should handle empty content array from API', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({ content: [] })
            });

            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyIds(['nonexistent-1', 'nonexistent-2']);

            expect(result).toHaveLength(2);
            expect(result[0]).toBeNull();
            expect(result[1]).toBeNull();
        });

        test('should handle missing content property from API', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValueOnce({})
            });

            const result = await reccobeatsClient.getAudioFeaturesByReccoOrSpotifyIds(['id-1', 'id-2']);

            expect(result).toHaveLength(2);
            expect(result[0]).toBeNull();
            expect(result[1]).toBeNull();
        });

        afterAll(() => {
            console.log('🏁 ReccoBeats Client Test completed');
        });
    });
});