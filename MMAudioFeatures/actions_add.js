"use strict";
(() => {
    requirejs('lib/spotify-client');
    requirejs('lib/reccobeats-client');
    requirejs('lib/utils');

    window.whenReady(() => {
        function getConfig() {
            try {
                return app.getValue('MMAudioFeatures_config', {
                    spotifyClient: '',
                    spotifySecret: '',
                    saveBPM: true,
                    saveInitialKey: true,
                    saveDanceability: true,
                    saveEnergy: true,
                    saveValence: true,
                    saveAcousticness: true,
                    saveInstrumentalness: true,
                    saveComment: true
                });
            } catch (error) {
                console.error('Error loading configuration:', error);
                return {
                    spotifyClient: '',
                    spotifySecret: '',
                    saveBPM: true,
                    saveInitialKey: true,
                    saveDanceability: true,
                    saveEnergy: true,
                    saveValence: true,
                    saveAcousticness: true,
                    saveInstrumentalness: true,
                    saveComment: true
                };
            }
        }

        // MMAudioFeatures addon object
        var MMAudioFeaturesAddon = {
            openSearchDialog: async function (tracks) {
                // Close previous dialog if exists
                if (window.currentDialog) {
                    try {
                        window.currentDialog.closeWindow();
                    } catch (e) {
                        console.log('Error closing previous dialog:', e);
                    }
                    window.currentDialog = null;
                }

                // Get current selected tracks and configuration
                const currentTracklist = uitools.getSelectedTracklist();
                const config = getConfig();

                // Open dialog with initial data
                var dlg = uitools.openDialog('dlgAudioFeaturesSearch', {
                    show: true,
                    notShared: true,
                    title: 'Audio Features Search',
                    // Pass data to dialog
                    inData: {
                        tracks: tracks,
                        tracklist: currentTracklist,
                        config: config
                    }
                });

                window.currentDialog = dlg;
            }
        };

        async function searchAudioFeatures() {
            var list = uitools.getSelectedTracklist();
            await list.whenLoaded();

            if (list.count === 0) {
                messageDlg(_("Select tracks to be updated"), 'Error', ['btnOK'], {
                    defaultButton: 'btnOK'
                }, function (result) {
                    modalResult = 0;
                });
                return;
            }

            list.locked(function () {
                const selectedTracks = [];
                for (let i = 0; i < list.count; i++) {
                    const track = list.getValue(i);
                    if (track) {
                        selectedTracks.push({
                            artist: track.artist,
                            title: track.title,
                            album: track.album,
                            index: i
                        });
                    }
                }

                if (selectedTracks.length > 0) {
                    MMAudioFeaturesAddon.openSearchDialog(selectedTracks);
                } else {
                    console.log('No tracks found.');
                }
            });
        }

        // Menu action
        actions.searchAudioFeatures = {
            title: _('Search Audio Features'),
            hotkeyAble: true,
            disabled: uitools.notMediaListSelected,
            visible: window.uitools.getCanEdit,
            icon: 'Scripts/MMAudioFeatures/icon.svg',
            execute: function () {
                searchAudioFeatures();
            }
        }

        window._menuItems.editTags.action.submenu.push({
            action: actions.searchAudioFeatures,
            order: 20,
            grouporder: 20
        });

        // Keyboard hotkey/shortcut
        hotkeys.addHotkey('Ctrl+Shift+A', 'searchAudioFeatures');
    });
})();