// frontend/src/components/FollowButton.jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';

function FollowButton({ userId, onFollowChange }) {
  const [relationship, setRelationship] = useState({ isFollowing: false, isFollowed: false, isFriend: false });
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const checkRelationship = async () => {
    try {
      const response = await api.get(`/follows/relation/${userId}`, {
        headers: { 'user-id': user.id }
      });
      setRelationship(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleFollow = async () => {
    if (!user.id) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    try {
      if (relationship.isFollowing) {
        await api.delete(`/follows/${userId}`, {
          headers: { 'user-id': user.id }
        });
        setRelationship({ isFollowing: false, isFollowed: relationship.isFollowed, isFriend: false });
      } else {
        await api.post(`/follows/${userId}`, {}, {
          headers: { 'user-id': user.id }
        });
        setRelationship({ isFollowing: true, isFollowed: relationship.isFollowed, isFriend: relationship.isFollowed });
      }
      if (onFollowChange) onFollowChange();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.id && userId !== user.id) {
      checkRelationship();
    }
  }, [userId, user.id]);

  if (userId === user.id) return null;

  let buttonText = 'Seguir';
  let buttonClass = 'bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29]';

  if (relationship.isFriend) {
    buttonText = '👥 Amigos';
    buttonClass = 'bg-blue-600 hover:bg-blue-700 text-white';
  } else if (relationship.isFollowing) {
    buttonText = 'Siguiendo';
    buttonClass = 'bg-gray-600 hover:bg-red-600 text-white hover:text-white';
  } else if (relationship.isFollowed) {
    buttonText = 'Seguir de vuelta';
    buttonClass = 'bg-[#01c38e] hover:bg-emerald-500 text-[#1a1e29]';
  }

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`px-4 py-2 rounded-lg font-bold transition disabled:opacity-50 ${buttonClass}`}
    >
      {loading ? '...' : buttonText}
    </button>
  );
}

export default FollowButton;