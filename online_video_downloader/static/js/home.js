// Add axios default configuration at the top of the file
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;

const HomePage = () => {
    const [url, setUrl] = React.useState('');
    const [platforms, setPlatforms] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [videoInfo, setVideoInfo] = React.useState(null);
    const [selectedQuality, setSelectedQuality] = React.useState(null);

    React.useEffect(() => {
        // Add error handling for the initial request
        const fetchPlatforms = async () => {
            try {
                const response = await axios.get('/api/supported-platforms/');
                setPlatforms(response.data);
            } catch (error) {
                console.error('Error fetching platforms:', error);
                setError('Failed to load supported platforms');
            }
        };
        
        fetchPlatforms();
    }, []);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setVideoInfo(null);

        try {
            const response = await axios.post('/api/video-info/', { url });
            setVideoInfo(response.data);
            if (response.data.streams.length > 0) {
                setSelectedQuality(response.data.streams[0].itag);
            }
        } catch (error) {
            setError(error.response?.data?.error || 'An error occurred while fetching video information.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/download/', {
                url,
                itag: selectedQuality
            }, {
                responseType: 'blob'
            });

            const contentDisposition = response.headers['content-disposition'];
            const fileName = contentDisposition
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : 'video.mp4';

            const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            setError(error.response?.data?.error || 'An error occurred while downloading the video.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 py-6 flex flex-col justify-center sm:py-12">
            <div className="relative py-3 sm:max-w-xl sm:mx-auto">
                <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
                    <div className="max-w-md mx-auto">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Online Video Downloader</h1>
                            <p className="text-sm text-gray-600 mb-8">Download Videos & Images from Anywhere on the Web</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="peer placeholder-transparent h-10 w-full border-b-2 border-gray-300 text-gray-900 focus:outline-none focus:border-rose-600" 
                                    placeholder="Paste video URL here" 
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    disabled={loading}
                                />
                                <label className="absolute left-0 -top-3.5 text-gray-600 text-sm">Paste video URL here</label>
                            </div>
                            <button 
                                className={`w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? 'Loading...' : 'Get Video Info'}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-4 text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        {videoInfo && (
                            <div className="mt-8 space-y-4">
                                <div className="aspect-w-16 aspect-h-9">
                                    <img 
                                        src={videoInfo.thumbnail_url} 
                                        alt={videoInfo.title}
                                        className="rounded-lg object-cover w-full"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-lg font-semibold">{videoInfo.title}</h2>
                                    <p className="text-sm text-gray-600">
                                        By {videoInfo.author} • {formatDuration(videoInfo.duration)}
                                    </p>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Select Quality:
                                        </label>
                                        <select
                                            className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            value={selectedQuality}
                                            onChange={(e) => setSelectedQuality(e.target.value)}
                                        >
                                            {videoInfo.streams.map((stream) => (
                                                <option key={stream.itag} value={stream.itag}>
                                                    {stream.resolution} - {formatFileSize(stream.filesize)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleDownload}
                                        disabled={loading}
                                        className={`w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {loading ? 'Downloading...' : 'Download'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-8">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Supported Platforms:</p>
                            <div className="flex flex-wrap justify-center">
                                {platforms.map((platform, index) => (
                                    <div key={index} className="m-2 text-center">
                                        <i className={`${platform.icon} text-3xl text-gray-600 hover:text-gray-800 transition-colors duration-200`}></i>
                                        <p className="text-xs mt-1">{platform.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Add error boundary
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
    return false;
};

// Render with error handling
try {
    ReactDOM.render(React.createElement(HomePage), document.getElementById('root'));
} catch (error) {
    console.error('Error rendering React component:', error);
    document.getElementById('root').innerHTML = '<div class="text-red-500">Error loading application. Please check console for details.</div>';
}
