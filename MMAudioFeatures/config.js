window.configInfo = {
    load: function (pnlDiv, addon) {
        // Load config with defaults - all ID3 tag options enabled by default
        this.config = app.getValue('MMAudioFeatures_config', {
            useSpotifySearch: false,  // Standard: ReccoBeats search
            spotifyClient: '',
            spotifySecret: '',
            // ID3 tag options
            saveBPM: true,
            saveInitialKey: true,
            saveDanceability: true,
            saveEnergy: true,
            saveValence: true,
            saveAcousticness: true,
            saveInstrumentalness: true,
            saveComment: true
        });

        // Set UI elements to the configuration settings
        var UI = getAllUIElements(pnlDiv);

        UI.txtSpotifyClient.controlClass.value = this.config.spotifyClient;
        UI.txtSpotifySecret.controlClass.value = this.config.spotifySecret;

        // Set radio button states based on useSpotifySearch
        if (this.config.useSpotifySearch) {
            UI.rbSpotifySearch.controlClass.checked = true;
        } else {
            UI.rbReccoBeats.controlClass.checked = true;
        }

        // Set checkbox states
        UI.chkSaveBPM.controlClass.checked = this.config.saveBPM;
        UI.chkSaveInitialKey.controlClass.checked = this.config.saveInitialKey;
        UI.chkSaveDanceability.controlClass.checked = this.config.saveDanceability;
        UI.chkSaveEnergy.controlClass.checked = this.config.saveEnergy;
        UI.chkSaveValence.controlClass.checked = this.config.saveValence;
        UI.chkSaveAcousticness.controlClass.checked = this.config.saveAcousticness;
        UI.chkSaveInstrumentalness.controlClass.checked = this.config.saveInstrumentalness;
        UI.chkSaveComment.controlClass.checked = this.config.saveComment;

        // Store UI reference for event handlers
        this.UI = UI;

        // Setup event handlers
        this.setupCustomFieldHandlers();
        this.setupSearchMethodHandlers();
        this.setupSpotifyHelpLink();

        // Initial updates
        this.updateCommentCheckbox();
        this.updateSpotifyCredentialsState();
    },

    setupCustomFieldHandlers: function () {
        var self = this;

        // Add event listeners to all custom field checkboxes
        var customFieldCheckboxes = [
            this.UI.chkSaveDanceability,
            this.UI.chkSaveEnergy,
            this.UI.chkSaveValence,
            this.UI.chkSaveAcousticness,
            this.UI.chkSaveInstrumentalness
        ];

        customFieldCheckboxes.forEach(function (checkbox) {
            if (checkbox && checkbox.controlClass) {
                localListen(checkbox, 'click', function () {
                    self.updateCommentCheckbox();
                });
            }
        });
    },

    setupSearchMethodHandlers: function () {
        var self = this;

        // Add event listeners for radio buttons
        if (this.UI.rbReccoBeats && this.UI.rbReccoBeats.controlClass) {
            localListen(this.UI.rbReccoBeats, 'click', function () {
                console.log('ReccoBeats radio selected');
                self.updateSpotifyCredentialsState();
            });
        }

        if (this.UI.rbSpotifySearch && this.UI.rbSpotifySearch.controlClass) {
            localListen(this.UI.rbSpotifySearch, 'click', function () {
                console.log('Spotify radio selected');
                self.updateSpotifyCredentialsState();
            });
        }
    },

    setupSpotifyHelpLink: function () {
        if (!this.UI.lblSpotifyHelp) {
            console.log('Spotify help label not found');
            return;
        }

        window.localListen(this.UI.lblSpotifyHelp, 'click', function () {
            window.uitools.openWeb('https://github.com/DrHardReset/MMAudioFeatures#setup-steps');
        });
    },

    updateCommentCheckbox: function () {
        if (!this.UI || !this.UI.chkSaveComment) return;

        // Check if any custom field is enabled
        var hasCustomFields =
            this.UI.chkSaveDanceability.controlClass.checked ||
            this.UI.chkSaveEnergy.controlClass.checked ||
            this.UI.chkSaveValence.controlClass.checked ||
            this.UI.chkSaveAcousticness.controlClass.checked ||
            this.UI.chkSaveInstrumentalness.controlClass.checked;

        // If no custom fields are selected, uncheck the comment checkbox
        if (!hasCustomFields) {
            this.UI.chkSaveComment.controlClass.checked = false;
        }

        // Enable/disable comment checkbox based on custom fields
        var saveComment = this.findInputElement(this.UI.chkSaveComment);

        if (saveComment) {
            saveComment.disabled = !hasCustomFields;
            saveComment.style.opacity = hasCustomFields ? '1' : '0.2';
        } else {
            console.log('Save comment input element not found');
        }
    },

    updateSpotifyCredentialsState: function () {
        if (!this.UI || !this.UI.rbSpotifySearch) return;

        // Enable/disable Spotify credentials based on selected radio button
        var useSpotifySearch = this.UI.rbSpotifySearch.controlClass.checked;

        // Find and update Spotify Client input
        var clientInput = this.findInputElement(this.UI.txtSpotifyClient);
        if (clientInput) {
            clientInput.disabled = !useSpotifySearch;
            clientInput.style.opacity = useSpotifySearch ? '1' : '0.2';
        } else {
            console.log('Client input element not found');
        }

        // Find and update Spotify Secret input
        var secretInput = this.findInputElement(this.UI.txtSpotifySecret);
        if (secretInput) {
            secretInput.disabled = !useSpotifySearch;
            secretInput.style.opacity = useSpotifySearch ? '1' : '0.2';
        } else {
            console.log('Secret input element not found');
        }
    },

    findInputElement: function (uiElement) {
        if (!uiElement) {
            console.log('uiElement is null');
            return null;
        }

        if (uiElement.querySelector) {
            var input = uiElement.querySelector('input');

            if (input) {
                return input;
            }
        }

        return null;
    },

    save: function (pnlDiv, addon) {
        // Save settings according to the UI changes
        var UI = getAllUIElements(pnlDiv);

        this.config.spotifyClient = UI.txtSpotifyClient.controlClass.value;
        this.config.spotifySecret = UI.txtSpotifySecret.controlClass.value;

        // Save radio button state as boolean
        this.config.useSpotifySearch = UI.rbSpotifySearch.controlClass.checked;

        // Save checkbox states
        this.config.saveBPM = UI.chkSaveBPM.controlClass.checked;
        this.config.saveInitialKey = UI.chkSaveInitialKey.controlClass.checked;
        this.config.saveDanceability = UI.chkSaveDanceability.controlClass.checked;
        this.config.saveEnergy = UI.chkSaveEnergy.controlClass.checked;
        this.config.saveValence = UI.chkSaveValence.controlClass.checked;
        this.config.saveAcousticness = UI.chkSaveAcousticness.controlClass.checked;
        this.config.saveInstrumentalness = UI.chkSaveInstrumentalness.controlClass.checked;
        this.config.saveComment = UI.chkSaveComment.controlClass.checked;

        app.setValue('MMAudioFeatures_config', this.config);
    }
}