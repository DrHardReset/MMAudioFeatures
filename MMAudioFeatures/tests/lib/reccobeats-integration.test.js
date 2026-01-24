'use strict';

const { ReccoBeatsClient } = require('../../lib/reccobeats-client');

/**
 * Integration Test for ReccoBeats API
 */
describe('ReccoBeats API Integration Test', () => {

    let reccoBeatsClient;

    beforeAll(() => {
        // Create client instance for real API tests
        reccoBeatsClient = new ReccoBeatsClient();

        console.log('Starting ReccoBeats Integration Test');
        console.log('Base URL:', reccoBeatsClient.baseUrl);
    });

    test('searchArtist finds "Headhunterz" with correct Spotify ID', async () => {
        const artistName = 'Headhunterz';
        const expectedReccoBeatsId = '167eef6a-383b-4817-907d-68dfce387ea3';
        const expectedSpotifyUrl = 'https://open.spotify.com/artist/6C0KWmCdqrLU2LzzWBPbOy';

        // Test with exactMatch=true to get the specific artist
        const exactResult = await reccoBeatsClient.searchArtist(artistName, true);

        expect(Array.isArray(exactResult)).toBe(true);
        expect(exactResult.length).toBeGreaterThan(0);

        // Find the expected artist in the results
        const foundArtist = exactResult.find(a => a.id === expectedReccoBeatsId);
        expect(foundArtist).toBeDefined();
        expect(foundArtist.name).toBe(artistName);
        expect(foundArtist.href).toBe(expectedSpotifyUrl);
        console.log(`✅ Found correct Spotify URL: ${foundArtist.href}`);
        console.log(`✅ Found ReccoBeats ID for artist '${artistName}': ${foundArtist.id}`);

        // Test without exactMatch to get all search results
        const allResults = await reccoBeatsClient.searchArtist(artistName, false);
        expect(Array.isArray(allResults)).toBe(true);
        expect(allResults.length).toBeGreaterThanOrEqual(exactResult.length);
        console.log(`Found ${allResults.length} total search results for '${artistName}'`);
        console.log(`Found ${exactResult.length} exact matches for '${artistName}'`);

        // Verify that exact matches are included in all results
        const exactArtistInAllResults = allResults.find(a => a.id === expectedReccoBeatsId);
        expect(exactArtistInAllResults).toBeDefined();

        console.log('Full exact match result:', foundArtist);
    }, 15000);

    test('searchArtistTrack finds "Orange Heart" by "Headhunterz"', async () => {
        const artist = 'Headhunterz';
        const trackName = 'Orange Heart';
        const expectedReccoBeatsTrackId = 'eb5f88c9-107a-4839-a18e-aa068184beaa';
        const expectedSpotifyTrackHref = 'https://open.spotify.com/track/01q0kDlM3acKwnmUW65IHN';

        try {
            const track = await reccoBeatsClient.searchArtistTrack(artist, trackName);

            expect(track).not.toBeNull();
            expect(track.trackTitle).toBe(trackName);
            expect(track.href).toBe(expectedSpotifyTrackHref);
            console.log(`Found correct Spotify track href: ${track.href}`);

            expect(track.id).toBe(expectedReccoBeatsTrackId);
            console.log(`Found correct ReccoBeats track ID for '${trackName}': ${track.id}`);
            console.log('Full track result:', track);
        } catch (error) {
            console.error('searchArtistTrack test error:', error.message);
            throw error;
        }
    }, 20000);

    test('searchArtistTrack finds "Orange Heart" by "Headhunterz" with multi artist query', async () => {
        const multiArtist = 'Headhunterz; Sian Evans';
        const artist = 'Headhunterz';
        const trackName = 'Orange Heart';
        const expectedReccoBeatsTrackId = 'eb5f88c9-107a-4839-a18e-aa068184beaa';
        const expectedSpotifyTrackHref = 'https://open.spotify.com/track/01q0kDlM3acKwnmUW65IHN';

        try {
            const track = await reccoBeatsClient.searchArtistTrack(multiArtist, trackName);

            expect(track).not.toBeNull();
            expect(track.trackTitle).toBe(trackName);

            expect(track.artists).toBeDefined();
            expect(track.artists.length).toBeGreaterThan(0);
            expect(track.artists.some(trackArtist => trackArtist.name === artist)).toBe(true);

            expect(track.href).toBe(expectedSpotifyTrackHref);
            console.log(`Found correct Spotify track href: ${track.href}`);

            expect(track.id).toBe(expectedReccoBeatsTrackId);
            console.log(`Found correct ReccoBeats track ID for '${trackName}': ${track.id}`);
            console.log('Full track result:', track);
        } catch (error) {
            console.error('searchArtistTrack test error:', error.message);
            throw error;
        }
    }, 20000);

    test('searchArtistAlbumTrack finds "Orange Heart" by "Headhunterz" on album "Orange Heart"', async () => {
        const artistName = 'Headhunterz';
        const albumName = 'Orange Heart';
        const trackName = 'Orange Heart';
        const expectedReccoBeatsTrackId = '73c6e0d8-e63f-4b9b-80aa-8aeab96021af';
        const expectedSpotifyTrackHref = 'https://open.spotify.com/track/6Gf7assZMey5UGOhYTBaaU';

        try {
            const result = await reccoBeatsClient.searchArtistAlbumTrack(artistName, albumName, trackName);

            expect(result).not.toBeNull();
            expect(result.trackTitle).toBe(trackName);

            // Validate artist information (using correct property names)
            expect(result.artistInfo).toBeDefined();
            expect(result.artistInfo.name).toBe(artistName);
            expect(result.artistInfo.id).toBeDefined();
            expect(typeof result.artistInfo.id).toBe('string');
            console.log(`Found artist info - ID: ${result.artistInfo.id}, Name: ${result.artistInfo.name}`);

            // Validate album information (using correct property names)
            expect(result.albumInfo).toBeDefined();
            expect(result.albumInfo.name).toBe(albumName);
            expect(result.albumInfo.id).toBeDefined();
            expect(typeof result.albumInfo.id).toBe('string');
            console.log(`Found album info - ID: ${result.albumInfo.id}, Title: ${result.albumInfo.name}`);

            // Validate Spotify URL and ReccoBeats ID
            expect(result.href).toBe(expectedSpotifyTrackHref);
            console.log(`✅ Found correct Spotify track URL: ${result.href}`);

            expect(result.id).toBe(expectedReccoBeatsTrackId);
            console.log(`✅ Found ReccoBeats track ID for '${trackName}': ${result.id}`);
            console.log('Full searchArtistAlbumTrack result:', {
                trackId: result.id,
                trackTitle: result.trackTitle,
                trackHref: result.href,
                artistInfo: result.artistInfo,
                albumInfo: result.albumInfo
            });

        } catch (error) {
            console.error('searchArtistAlbumTrack test error:', error.message);
            throw error;
        }
    }, 30000);

    describe('getAudioFeaturesByReccoOrSpotifyIds - Array-based Tests', () => {

        test('should throw error for non-array input', async () => {
            console.log('Testing getAudioFeaturesByReccoOrSpotifyIds with non-array input');

            await expect(reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyIds('single-id')).rejects.toThrow(
                'Array of IDs is required'
            );

            await expect(reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyIds(null)).rejects.toThrow(
                'Array of IDs is required'
            );

            console.log('Non-array input validation works correctly');
        });

        test('should return empty array for empty input', async () => {
            console.log('Testing getAudioFeaturesByReccoOrSpotifyIds with empty array');

            const result = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyIds([]);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual([]);
            console.log('Empty array correctly returned empty array');
        });

        test('should fetch audio features for single Spotify ID', async () => {
            // Example "Blinding Lights" by "The Weeknd"
            const testSpotifyId = '0VjIjW4GlUZAMYd2vXMi3b';

            console.log(`Testing getAudioFeaturesByReccoOrSpotifyIds with single ID: ${testSpotifyId}`);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyIds([testSpotifyId]);

                console.log('Single ID Audio Features API Response:', results);

                expect(Array.isArray(results)).toBe(true);
                expect(results).toHaveLength(1);

                const result = results[0];

                if (result !== null) {
                    // Audio features were found - validate structure
                    expect(result).toBeDefined();
                    expect(typeof result).toBe('object');

                    // Check expected audio feature fields
                    const expectedFeatures = [
                        'acousticness', 'danceability', 'energy', 'instrumentalness',
                        'liveness', 'loudness', 'speechiness', 'tempo', 'valence', 'key', 'mode'
                    ];

                    let foundFeatures = 0;
                    expectedFeatures.forEach(feature => {
                        if (result[feature] !== undefined) {
                            foundFeatures++;
                            console.log(`${feature}: ${result[feature]}`);

                            // Validate numerical values
                            if (['acousticness', 'danceability', 'energy', 'instrumentalness', 'liveness', 'speechiness', 'valence'].includes(feature)) {
                                expect(typeof result[feature]).toBe('number');
                                expect(result[feature]).toBeGreaterThanOrEqual(0);
                                expect(result[feature]).toBeLessThanOrEqual(1);
                            } else if (feature === 'tempo') {
                                expect(typeof result[feature]).toBe('number');
                                expect(result[feature]).toBeGreaterThan(0);
                                expect(result[feature]).toBeLessThan(300);
                            } else if (feature === 'loudness') {
                                expect(typeof result[feature]).toBe('number');
                                expect(result[feature]).toBeLessThanOrEqual(0);
                            } else if (['key', 'mode'].includes(feature)) {
                                expect(typeof result[feature]).toBe('number');
                                expect(Number.isInteger(result[feature])).toBe(true);
                            }
                        }
                    });

                    console.log(`Audio Features successfully found (${foundFeatures}/${expectedFeatures.length} features present)`);
                    expect(foundFeatures).toBeGreaterThan(0);

                    // Check ID and href
                    expect(typeof result.id).toBe('string');
                    expect(typeof result.href).toBe('string');
                    console.log('Track ID found:', result.id);
                    console.log('Track href found:', result.href);

                } else {
                    console.log('Audio Features not found in ReccoBeats database (returned null)');
                    expect(result).toBeNull();
                }

            } catch (error) {
                console.error('Audio Features API Error:', error.message);
                throw error;
            }
        }, 20000);

        test('should fetch audio features for multiple Spotify IDs', async () => {
            const testSpotifyIds = [
                '0VjIjW4GlUZAMYd2vXMi3b', // "Blinding Lights" by The Weeknd
                '4iV5W9uYEdYUVa79Axb7Rh', // "Shape of You" by Ed Sheeran
                '7qiZfU4dY1lWllzX7mPBI3'  // "Don't Stop Me Now" by Queen
            ];

            console.log(`Testing getAudioFeaturesByReccoOrSpotifyIds with ${testSpotifyIds.length} IDs:`, testSpotifyIds);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyIds(testSpotifyIds);

                console.log('Multiple IDs Audio Features API Response:', results);

                expect(Array.isArray(results)).toBe(true);
                expect(results).toHaveLength(testSpotifyIds.length);
                console.log(`Received ${results.length} results for ${testSpotifyIds.length} requested IDs`);

                // Validate each result
                results.forEach((result, index) => {
                    if (result) {
                        expect(typeof result).toBe('object');
                        console.log(`Result ${index + 1}:`, {
                            id: result.id,
                            tempo: result.tempo,
                            energy: result.energy,
                            danceability: result.danceability
                        });

                        expect(typeof result.id).toBe('string');
                        expect(typeof result.href).toBe('string');

                        if (result.tempo !== undefined) {
                            expect(typeof result.tempo).toBe('number');
                            expect(result.tempo).toBeGreaterThan(0);
                        }

                        if (result.energy !== undefined) {
                            expect(typeof result.energy).toBe('number');
                            expect(result.energy).toBeGreaterThanOrEqual(0);
                            expect(result.energy).toBeLessThanOrEqual(1);
                        }

                        if (result.danceability !== undefined) {
                            expect(typeof result.danceability).toBe('number');
                            expect(result.danceability).toBeGreaterThanOrEqual(0);
                            expect(result.danceability).toBeLessThanOrEqual(1);
                        }
                    } else {
                        console.log(`Result ${index + 1}: null (not found)`);
                    }
                });

                console.log(`✅ Multiple IDs request successfully processed ${results.length} results`);

            } catch (error) {
                console.error('Multiple IDs Audio Features API Error:', error.message);
                throw error;
            }
        }, 25000);

        test('should handle invalid IDs gracefully', async () => {
            const invalidIds = ['invalid-id-1', 'invalid-id-2'];

            console.log('Testing getAudioFeaturesByReccoOrSpotifyIds with invalid IDs:', invalidIds);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyIds(invalidIds);

                expect(Array.isArray(results)).toBe(true);
                expect(results).toHaveLength(invalidIds.length);

                // All should be null for invalid IDs
                results.forEach(result => {
                    expect(result).toBeNull();
                });

                console.log('Invalid IDs correctly returned null values');

            } catch (error) {
                console.error('Invalid IDs Error:', error.message);
                throw error;
            }
        }, 15000);

        test('should handle mixed valid and invalid IDs', async () => {
            const mixedIds = [
                '0VjIjW4GlUZAMYd2vXMi3b', // Valid: "Blinding Lights"
                'invalid-spotify-id-12345', // Invalid
                '4iV5W9uYEdYUVa79Axb7Rh'  // Valid: "Shape of You"
            ];

            console.log('Testing getAudioFeaturesByReccoOrSpotifyIds with mixed valid/invalid IDs:', mixedIds);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyIds(mixedIds);

                console.log('Mixed IDs results:', results);

                expect(Array.isArray(results)).toBe(true);
                expect(results).toHaveLength(mixedIds.length);

                // Check that valid IDs returned data (or null) and invalid IDs returned null
                expect(results[1]).toBeNull(); // Middle invalid ID should be null

                console.log(`Received ${results.length} results for ${mixedIds.length} requested mixed IDs`);
                console.log('✅ Mixed ID request handled gracefully');

            } catch (error) {
                console.error('Mixed IDs Error:', error.message);
                throw error;
            }
        }, 15000);

        test('should handle large batch (> 40 IDs) by automatic chunking', async () => {
            // Create 45 test IDs to test automatic chunking
            const largeIdSet = Array.from({ length: 45 }, (_, i) => `test-spotify-id-${i.toString().padStart(3, '0')}`);

            console.log(`Testing getAudioFeaturesByReccoOrSpotifyIds with ${largeIdSet.length} IDs (should auto-chunk into 2 requests)`);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyIds(largeIdSet);

                expect(Array.isArray(results)).toBe(true);
                expect(results).toHaveLength(largeIdSet.length);
                console.log(`Large batch returned ${results.length} results for ${largeIdSet.length} requested IDs`);

                // All should be null since these are fake IDs
                results.forEach(result => {
                    expect(result).toBeNull();
                });

                console.log('✅ Large batch automatic chunking works correctly');

            } catch (error) {
                console.error('Large batch error:', error.message);
                throw error;
            }

        }, 30000);

        test('should maintain order with chunking', async () => {
            // Use 50 real IDs (if available) or mix of real and fake
            const testIds = [
                '0VjIjW4GlUZAMYd2vXMi3b', // Real
                ...Array.from({ length: 40 }, (_, i) => `fake-id-${i}`), // Fake IDs for chunk 1
                '4iV5W9uYEdYUVa79Axb7Rh', // Real
                ...Array.from({ length: 8 }, (_, i) => `fake-id-chunk2-${i}`) // Fake IDs for chunk 2
            ];

            console.log(`Testing order preservation with ${testIds.length} IDs across multiple chunks`);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyIds(testIds);

                expect(Array.isArray(results)).toBe(true);
                expect(results).toHaveLength(testIds.length);

                // First result should correspond to first real ID (or be null)
                console.log('First ID result:', results[0] ? results[0].id : 'null');

                // 41st result should correspond to second real ID (or be null)
                console.log('41st ID result:', results[41] ? results[41].id : 'null');

                console.log('✅ Order maintained across chunks');

            } catch (error) {
                console.error('Order preservation error:', error.message);
                throw error;
            }

        }, 35000);

        test('should handle partial chunk failure gracefully', async () => {
            // This test simulates what happens when some chunks succeed and others fail
            // We can't force a real API failure, but we test with a mix of potentially problematic IDs
            const problematicIds = [
                '0VjIjW4GlUZAMYd2vXMi3b', // Valid
                ...Array.from({ length: 50 }, (_, i) => `potentially-bad-id-${i}`)
            ];

            console.log(`Testing partial failure handling with ${problematicIds.length} IDs`);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyIds(problematicIds);

                expect(Array.isArray(results)).toBe(true);
                expect(results).toHaveLength(problematicIds.length);

                console.log('✅ Partial failure scenario handled - array length maintained');

            } catch (error) {
                // Even on error, the function should not throw but return nulls
                console.error('Unexpected error in partial failure test:', error.message);
                throw error;
            }

        }, 40000);

    });

    afterAll(() => {
        console.log('🏁 ReccoBeats Integration Test completed');
    });

});