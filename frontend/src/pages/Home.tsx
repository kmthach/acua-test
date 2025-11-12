import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/timeline" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to ACUA Social
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Connect, share, and engage with your community
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/register"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;

