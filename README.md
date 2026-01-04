# MM Audio Features

![MM Audio Features Icon](https://raw.githubusercontent.com/DrHardReset/MMAudioFeatures/main/MMAudioFeatures/icon.svg)

This MediaMonkey addon enhances your music collection by automatically fetching and storing detailed audio features for your tracks. Using Spotify's comprehensive music database for track identification and ReccoBeats' audio feature database, this addon enriches your metadata with professional audio characteristics.

![Version](https://img.shields.io/badge/dynamic/json?color=blue&label=version&query=version&url=https%3A//raw.githubusercontent.com/DrHardReset/MMAudioFeatures/main/MMAudioFeatures/info.json)
![MediaMonkey](https://img.shields.io/badge/MediaMonkey-5.x-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

## ✨ Features

### 🎵 Comprehensive Audio Feature Retrieval
- **BPM (Tempo)**: Precise beats per minute for DJ mixing and workout playlists
- **Musical Key**: Track's key signature for harmonic mixing
- **Danceability**: How suitable a track is for dancing (0-100%)
- **Energy**: Intensity and power of the track (0-100%)
- **Valence**: Musical positivity/mood of the track (0-100%)
- **Acousticness**: Confidence measure of acoustic vs. electric instruments (0-100%)
- **Instrumentalness**: Likelihood that a track contains no vocals (0-100%)

### 🔧 Smart Integration
- **Automatic Spotify Search**: Finds tracks using artist, title, and album information for accurate identification
- **ReccoBeats Audio Features**: Retrieves pre-analyzed audio features from ReccoBeats database
- **Two-Step Process**: Uses Spotify's superior search to identify tracks, then fetches audio features from ReccoBeats
- **Flexible Configuration**: Choose which audio features to save
- **Custom Field Mapping**: Maps audio features to MediaMonkey's custom fields
- **Batch Processing**: Process multiple tracks simultaneously
- **Error Handling**: Graceful handling of tracks not found in databases

### 🎛️ User Experience
- **Intuitive Search Dialog**: User-friendly interface with real-time progress
- **Detailed Results View**: Preview all audio features before saving
- **Configurable Output**: Enable/disable specific audio features
- **Keyboard Shortcut**: Quick access via `Ctrl+Shift+A`
- **Context Menu Integration**: Available in the "Edit Tags" menu

## 🚀 Installation

### Prerequisites
- MediaMonkey 5.x
- Spotify Developer Account (for API credentials)
- Active internet connection

### Setup Steps

1. **Get Spotify API Credentials**
   - Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Create a new app
   - Use any **App name** and **App description** of your choice
   - Set **Redirect URL** to `https://developer.spotify.com` (or any valid URL)
   - Select checkbox to use `Web API`
   - Note your `Client ID` and `Client Secret`

2. **Install the Addon**
   - Download the latest `.mmip` file from [releases](https://github.com/DrHardReset/MMAudioFeatures/releases/latest)
   - Double-click to install in MediaMonkey

3. **Configure the Addon**
   - Go to **Tools > Options > General > Add-ons**
   - Find "MM Audio Features" and click **Configure**
   - Enter your Spotify credentials
   - Select which audio features to save

## 📖 Usage

### How It Works
1. **Track Identification**: The addon searches Spotify's database using your track's artist, title, and album information
2. **Feature Retrieval**: Once a match is found, it retrieves the corresponding audio features from ReccoBeats database
3. **Data Mapping**: Audio features are then stored in your MediaMonkey database according to your configuration

### Basic Usage
1. Select tracks in your MediaMonkey library
2. Right-click and choose **Edit Tags > Search Audio Features**
3. Or use keyboard shortcut `Ctrl+Shift+A`
4. Review the found audio features in the dialog
5. Click **Save** to apply the changes to your tracks

### Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| **Spotify Client ID** | Your Spotify app client ID | *Required* |
| **Spotify Client Secret** | Your Spotify app secret | *Required* |
| **Save BPM** | Store tempo as BPM field | ✅ Enabled |
| **Save Initial Key** | Store musical key | ✅ Enabled |
| **Save Danceability** | Store as Custom1 field | ✅ Enabled |
| **Save Energy** | Store as Custom2 field | ✅ Enabled |
| **Save Valence** | Store as Custom3 field | ✅ Enabled |
| **Save Acousticness** | Store as Custom4 field | ✅ Enabled |
| **Save Instrumentalness** | Store as Custom5 field | ✅ Enabled |
| **Save Comment** | Add field mapping to comment | ✅ Enabled |

### Field Mapping

The addon maps audio features to MediaMonkey fields as follows:

- **BPM** → `Track.BPM`
- **Key** → `Track.InitialKey`
- **Danceability** → `Track.Custom1`
- **Energy** → `Track.Custom2`
- **Valence** → `Track.Custom3`
- **Acousticness** → `Track.Custom4`
- **Instrumentalness** → `Track.Custom5`

When enabled, the comment field includes a mapping reference:
##############################\
AudioFeatures:\
• Custom1: Danceability\
• Custom2: Energy\
• Custom3: Valence\
• Custom4: Acousticness\
• Custom5: Instrumentalness\
##############################

## ⚖️ Legal Disclaimer & Third-Party Services

### API Usage & Terms of Service
This addon uses third-party APIs to retrieve audio feature data:

- **Spotify Web API**: Used for track identification and search functionality
  - Users must obtain their own Spotify Developer credentials
  - All Spotify API usage is subject to [Spotify's Terms of Service](https://developer.spotify.com/terms/)
  - Rate limiting and usage policies apply as defined by Spotify

- **ReccoBeats API**: Used to retrieve pre-analyzed audio features
  - Service provided by ReccoBeats under their terms and conditions
  - Audio features are retrieved according to ReccoBeats' usage policies

### Intellectual Property Notice
- **Spotify® is a registered trademark** of Spotify AB
- **MediaMonkey® is a registered trademark** of Ventis Media Inc.
- **ReccoBeats** is a service provided by ReccoBeats and subject to their terms

This addon is **independently developed** and is **not affiliated with, endorsed by, or sponsored by** Spotify AB, Ventis Media Inc., or ReccoBeats. All trademarks and service marks are the property of their respective owners.

### Data & Privacy
- This addon does **not store or transmit** your personal music data beyond API requests
- API calls are made directly from your MediaMonkey installation to the respective services
- No user data is collected, stored, or shared by this addon
- Audio features retrieved are stored locally in your MediaMonkey database only

### Limitation of Liability
This software is provided "AS IS" without warranty of any kind. The author assumes no responsibility for:
- API service availability or accuracy
- Data loss or corruption
- Violation of third-party terms of service
- Any damages arising from the use of this software

**Users are responsible for:**
- Complying with all applicable terms of service for third-party APIs
- Obtaining proper API credentials and permissions
- Using the addon in accordance with applicable laws and regulations

## 🏗️ Development

### Building from Source
- Debug build: copies addon data to portable MediaMonkey Scripts folder
	(C:\MediaMonkey\Portable\Scripts\MMAudioFeatures)
- Release build: creates .mmip package in bin folder

### Running Tests
- Unit-Tests: `npm test`
- Integration-Tests `npm run test:integration`

### Debugging
- Start Mediamonkey
- Open webbrowser and go to `http://localhost:9222/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Spotify** for their comprehensive Web API and superior search capabilities
- **ReccoBeats** for providing pre-analyzed audio feature databases
- **MediaMonkey** community for support and feedback

---

**Made with ❤️ by [DrHardReset](https://github.com/DrHardReset)**

*Developed with AI assistance - This is an independent project and is not affiliated with Spotify, MediaMonkey, or ReccoBeats.*