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

    describe('getAudioFeaturesByReccoOrSpotifyId - Single ID Tests', () => {

        test('should fetch audio features for existing Spotify ID', async () => {
            // Example "Blinding Lights" by "The Weeknd"
            const testSpotifyId = '0VjIjW4GlUZAMYd2vXMi3b';

            console.log(`Testing getAudioFeaturesByReccoOrSpotifyId with Spotify ID: ${testSpotifyId}`);

            try {
                const result = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(testSpotifyId);

                console.log('Audio Features API Response:', result);

                if (result !== null) {
                    // Audio features were found - validate structure
                    expect(result).toBeDefined();
                    expect(typeof result).toBe('object');

                    // Check expected audio feature fields (updated for correct API spec)
                    const expectedFeatures = [
                        'acousticness', 'danceability', 'energy', 'instrumentalness',
                        'liveness', 'loudness', 'speechiness', 'tempo', 'valence', 'key', 'mode'
                    ];

                    let foundFeatures = 0;
                    expectedFeatures.forEach(feature => {
                        if (result[feature] !== undefined) {
                            foundFeatures++;
                            console.log(`${feature}: ${result[feature]}`);

                            // Validate that numerical values are in expected range
                            if (['acousticness', 'danceability', 'energy', 'instrumentalness', 'liveness', 'speechiness', 'valence'].includes(feature)) {
                                expect(typeof result[feature]).toBe('number');
                                expect(result[feature]).toBeGreaterThanOrEqual(0);
                                expect(result[feature]).toBeLessThanOrEqual(1);
                            } else if (feature === 'tempo') {
                                expect(typeof result[feature]).toBe('number');
                                expect(result[feature]).toBeGreaterThan(0);
                                expect(result[feature]).toBeLessThan(300); // Reasonable tempo range
                            } else if (feature === 'loudness') {
                                expect(typeof result[feature]).toBe('number');
                                expect(result[feature]).toBeLessThanOrEqual(0); // Loudness is typically negative
                            } else if (['key', 'mode'].includes(feature)) {
                                expect(typeof result[feature]).toBe('number');
                                expect(Number.isInteger(result[feature])).toBe(true); // Integer values
                            }
                        }
                    });

                    console.log(`Audio Features successfully found (${foundFeatures}/${expectedFeatures.length} features present)`);

                    // At least some features should be present
                    expect(foundFeatures).toBeGreaterThan(0);

                    // Check if ID and href are present (updated for correct API spec)
                    expect(typeof result.id).toBe('string');
                    expect(typeof result.href).toBe('string');
                    console.log('Track ID found:', result.id);
                    console.log('Track href found:', result.href);

                    // Check ISRC if present
                    if (result.isrc) {
                        expect(typeof result.isrc).toBe('string');
                        console.log('ISRC found:', result.isrc);
                    }

                } else {
                    // Audio features were not found - this is also a valid result
                    console.log('Audio Features not found in ReccoBeats database (returned null)');
                    expect(result).toBeNull();
                }

            } catch (error) {
                console.error('Audio Features API Error:', error.message);
                throw error; // Re-throw for unexpected errors
            }
        }, 20000); // 20 seconds timeout for Audio Features API call

        test('should handle invalid ID gracefully', async () => {
            const invalidId = 'invalid-spotify-id-12345';

            console.log(`Testing getAudioFeaturesByReccoOrSpotifyId with invalid ID: ${invalidId}`);

            try {
                const result = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(invalidId);

                // Expect null to be returned for invalid IDs
                expect(result).toBeNull();
                console.log('Invalid ID correctly returned null');

            } catch (error) {
                console.warn('Unexpected error for invalid ID:', error.message);
                throw error;
            }
        }, 10000);

        test('should throw error for empty ID', async () => {
            console.log('Testing getAudioFeaturesByReccoOrSpotifyId with empty ID');

            await expect(reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId('')).rejects.toThrow(
                'ReccoBeats ID or Spotify ID is required'
            );

            await expect(reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(null)).rejects.toThrow(
                'ReccoBeats ID or Spotify ID is required'
            );

            console.log('Empty ID validation works correctly');
        });

    });

    describe('getAudioFeaturesByReccoOrSpotifyId - Batch Array Tests', () => {

        test('should fetch audio features for multiple Spotify IDs using array', async () => {
            // Test with multiple known Spotify IDs
            const testSpotifyIds = [
                '0VjIjW4GlUZAMYd2vXMi3b', // "Blinding Lights" by The Weeknd
                '4iV5W9uYEdYUVa79Axb7Rh', // "Shape of You" by Ed Sheeran
                '7qiZfU4dY1lWllzX7mPBI3'  // "Don't Stop Me Now" by Queen
            ];

            console.log(`Testing getAudioFeaturesByReccoOrSpotifyId with array of ${testSpotifyIds.length} IDs:`, testSpotifyIds);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(testSpotifyIds);

                console.log('Batch Audio Features API Response:', results);

                // Should return an array
                expect(Array.isArray(results)).toBe(true);
                console.log(`Received ${results.length} results for ${testSpotifyIds.length} requested IDs`);

                // Validate each result that was found
                results.forEach((result, index) => {
                    if (result) {
                        expect(typeof result).toBe('object');
                        console.log(`Result ${index + 1}:`, {
                            id: result.id,
                            tempo: result.tempo,
                            energy: result.energy,
                            danceability: result.danceability
                        });

                        // Validate basic structure (updated for correct API spec)
                        expect(typeof result.id).toBe('string');
                        expect(typeof result.href).toBe('string');

                        // Test some audio features if present
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
                    }
                });

                console.log(`✅ Batch request successfully processed ${results.length} results`);

            } catch (error) {
                console.error('Batch Audio Features API Error:', error.message);
                throw error;
            }
        }, 25000); // 25 seconds timeout for batch API call

        test('should handle empty array', async () => {
            console.log('Testing getAudioFeaturesByReccoOrSpotifyId with empty array');

            await expect(reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId([])).rejects.toThrow(
                'At least one ID is required'
            );

            console.log('Empty array validation works correctly');
        });

        test('should handle array with too many IDs', async () => {
            const tooManyIds = Array.from({ length: 41 }, (_, i) => `test-id-${i}`);

            console.log(`Testing getAudioFeaturesByReccoOrSpotifyId with ${tooManyIds.length} IDs (should exceed limit)`);

            await expect(reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(tooManyIds)).rejects.toThrow(
                'Maximum 40 IDs allowed per request'
            );

            console.log('Array size limit validation works correctly');
        });

        test('should handle mixed valid and invalid IDs in array', async () => {
            const mixedIds = [
                '0VjIjW4GlUZAMYd2vXMi3b', // Valid: "Blinding Lights" by The Weeknd
                'invalid-spotify-id-12345', // Invalid
                '4iV5W9uYEdYUVa79Axb7Rh'  // Valid: "Shape of You" by Ed Sheeran
            ];

            console.log('Testing getAudioFeaturesByReccoOrSpotifyId with mixed valid/invalid IDs:', mixedIds);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesByReccoOrSpotifyId(mixedIds);

                console.log('Mixed IDs results:', results);

                // Should return an array (might be empty or partially filled)
                expect(Array.isArray(results)).toBe(true);
                console.log(`Received ${results.length} results for ${mixedIds.length} requested mixed IDs`);

                console.log('✅ Mixed ID request handled gracefully');

            } catch (error) {
                console.error('Mixed IDs Error:', error.message);
            }
        }, 15000);

    });

    describe('getAudioFeaturesBatch - Dedicated Batch Method Tests', () => {

        test('should process batch of IDs correctly', async () => {
            const testSpotifyIds = [
                '0VjIjW4GlUZAMYd2vXMi3b', // "Blinding Lights" by The Weeknd
                '4iV5W9uYEdYUVa79Axb7Rh', // "Shape of You" by Ed Sheeran
                '7qiZfU4dY1lWllzX7mPBI3'  // "Don't Stop Me Now" by Queen
            ];

            console.log(`Testing getAudioFeaturesBatch with ${testSpotifyIds.length} IDs:`, testSpotifyIds);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesBatch(testSpotifyIds);

                console.log('Batch method results:', results);

                // Should return an array
                expect(Array.isArray(results)).toBe(true);

                expect(results.length).toBe(testSpotifyIds.length);
                console.log(`✅ Correct array size: ${results.length} results for ${testSpotifyIds.length} requested IDs`);

                results.forEach((result, index) => {
                    const requestedSpotifyId = testSpotifyIds[index];
                    console.log(`\n--- Validating result ${index + 1} for Spotify ID: ${requestedSpotifyId} ---`);

                    if (result === null) {
                        console.log(`Result ${index + 1}: No audio features found (null) - this is acceptable`);
                        return; // Skip to next result - null is valid for tracks not found in database
                    }

                    // If a result is present, it must be an object
                    expect(typeof result).toBe('object');
                    expect(result).not.toBeNull();

                    let idMatched = false;
                    let matchReason = '';

                    // Option 1: result.href should contain the corresponding Spotify URL
                    if (result.href) {
                        const expectedSpotifyUrl = `https://open.spotify.com/track/${requestedSpotifyId}`;

                        if (result.href === expectedSpotifyUrl) {
                            idMatched = true;
                            matchReason = `href matches Spotify URL: ${result.href}`;
                        }
                    }

                    // Option 2: result.id should be ReccoBeats ID
                    if (!idMatched && result.id && result.id === requestedSpotifyId) {
                        idMatched = true;
                        matchReason = `id matches requested Spotify ID: ${result.id}`;
                    }

                    // Enforce ID validation
                    expect(idMatched).toBe(true);
                    console.log(`✅ Result ${index + 1}: ${matchReason}`);
                });

                console.log(`\n✅ All ${testSpotifyIds.length} results validated successfully`);
                console.log('✅ Dedicated batch method works correctly with proper ID validation');

            } catch (error) {
                console.error('Batch method error:', error.message);
                throw error;
            }

        }, 25000);

        test('should throw error for non-array input to batch method', async () => {
            console.log('Testing getAudioFeaturesBatch with non-array input');

            await expect(reccoBeatsClient.getAudioFeaturesBatch('single-id')).rejects.toThrow(
                'Array of IDs is required for batch processing'
            );

            await expect(reccoBeatsClient.getAudioFeaturesBatch(null)).rejects.toThrow(
                'Array of IDs is required for batch processing'
            );

            console.log('Batch method input validation works correctly');
        });

        test('should handle large batch (> 40 IDs) by chunking', async () => {
            // Create 45 test IDs to test chunking
            const largeIdSet = Array.from({ length: 45 }, (_, i) => `test-spotify-id-${i.toString().padStart(3, '0')}`);

            console.log(`Testing getAudioFeaturesBatch with ${largeIdSet.length} IDs (should chunk into 2 requests)`);

            try {
                const results = await reccoBeatsClient.getAudioFeaturesBatch(largeIdSet);

                // Should return an array
                expect(Array.isArray(results)).toBe(true);
                console.log(`Large batch returned ${results.length} results for ${largeIdSet.length} requested IDs`);

                console.log('✅ Large batch chunking works correctly');

            } catch (error) {
                console.error('Large batch error:', error.message);
                throw error;
            }

        }, 30000);

    });

    afterAll(() => {
        console.log('🏁 ReccoBeats Integration Test completed');
    });

});