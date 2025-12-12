import { Link } from "react-router-dom";

const UnknownSession = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
                <h1 className="text-3xl font-bold mb-4 text-gray-800">Session Not Found</h1>
                <p className="text-lg text-gray-600 mb-6">
                    Your session appears to be missing or has expired. Please sign in again to continue.
                </p>
                <Link
                    to="/auth"
                    className="inline-block px-6 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
                >
                    Go to Sign In
                </Link>
            </div>
        </div>
    );
};

export default UnknownSession;
