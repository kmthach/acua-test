import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/timeline" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="text-center">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
          Welcome to ACUA Social
        </h1>
        <p className="text-2xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Connect, share, and engage with your community
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            to="/register"
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-lg border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;

