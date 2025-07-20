// src/front/components/ProfileEditForm.jsx - Extracted Profile Editing Component

import React, { useState, useEffect } from 'react';
import authService from '../store/authService';
import toast from 'react-hot-toast';

/**
 * ProfileEditForm Component
 * Handles all profile editing functionality extracted from Profile.jsx
 */
const ProfileEditForm = ({ 
    user, 
    onUserUpdate, 
    onCancel,
    className = "" 
}) => {
    const [formData, setFormData] = useState({
        bio: '',
        avatar_url: '',
        gaming_style: '',
        favorite_genres: []
    });
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState(null);

    // Available options
    const availableGenres = [
        'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 
        'Sports', 'Racing', 'Puzzle', 'Fighting', 'Shooter', 
        'Horror', 'Platformer', 'MMO', 'Battle Royale', 'MOBA', 'Indie'
    ];
    const gamingStyles = ['Casual', 'Competitive', 'Hardcore', 'Social', 'Solo', 'Co-op'];

    // Initialize form data when user changes
    useEffect(() => {
        if (user) {
            setFormData({
                bio: user.bio || '',
                avatar_url: user.avatar_url || '',
                gaming_style: user.gaming_style || '',
                favorite_genres: user.favorite_genres || []
            });
            setFormError(null);
        }
    }, [user]);

    /**
     * Handle form field changes
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear errors when user starts typing
        if (formError) {
            setFormError(null);
        }
    };

    /**
     * Handle genre selection toggle
     */
    const handleGenreToggle = (genre) => {
        setFormData(prev => ({
            ...prev,
            favorite_genres: prev.favorite_genres.includes(genre)
                ? prev.favorite_genres.filter(g => g !== genre)
                : [...prev.favorite_genres, genre]
        }));
        
        if (formError) {
            setFormError(null);
        }
    };

    /**
     * Validate form data
     */
    const validateForm = () => {
        const errors = [];
        
        if (formData.bio && formData.bio.length > 500) {
            errors.push('Bio must be less than 500 characters');
        }
        
        if (formData.avatar_url && formData.avatar_url.length > 0) {
            try {
                new URL(formData.avatar_url);
            } catch {
                errors.push('Avatar URL must be a valid URL');
            }
        }
        
        if (formData.favorite_genres.length > 8) {
            errors.push('Please select no more than 8 favorite genres');
        }
        
        return errors;
    };

    /**
     * Handle form submission
     */
    const handleSave = async () => {
        // Validate form
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            setFormError(validationErrors[0]);
            toast.error(validationErrors[0]);
            return;
        }

        setIsSaving(true);
        setFormError(null);
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const response = await authService.authenticatedFetch(`${backendUrl}/api/auth/profile`, {
                method: 'PUT',
                body: JSON.stringify({
                    bio: formData.bio,
                    avatar_url: formData.avatar_url,
                    gaming_style: formData.gaming_style,
                    favorite_genres: formData.favorite_genres
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update user data
                if (onUserUpdate) {
                    onUserUpdate(data.user);
                }
                
                toast.success('Profile updated successfully!');
                
                // Exit edit mode
                if (onCancel) {
                    onCancel();
                }
                
            } else {
                const data = await response.json();
                const errorMessage = data.error || 'Failed to update profile';
                setFormError(errorMessage);
                toast.error(errorMessage);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            const errorMessage = 'Network error updating profile';
            setFormError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Handle cancel action
     */
    const handleCancel = () => {
        // Reset form to original user data
        if (user) {
            setFormData({
                bio: user.bio || '',
                avatar_url: user.avatar_url || '',
                gaming_style: user.gaming_style || '',
                favorite_genres: user.favorite_genres || []
            });
        }
        setFormError(null);
        
        if (onCancel) {
            onCancel();
        }
    };

    /**
     * Check if form has changes
     */
    const hasChanges = () => {
        if (!user) return false;
        
        return (
            formData.bio !== (user.bio || '') ||
            formData.avatar_url !== (user.avatar_url || '') ||
            formData.gaming_style !== (user.gaming_style || '') ||
            JSON.stringify(formData.favorite_genres) !== JSON.stringify(user.favorite_genres || [])
        );
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Form Error Display */}
            {formError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                    <div className="flex items-center space-x-2">
                        <span>⚠️</span>
                        <div>
                            <strong>Form Error:</strong> {formError}
                        </div>
                    </div>
                    <button 
                        onClick={() => setFormError(null)}
                        className="mt-2 text-xs underline hover:no-underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Bio Field */}
            <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">
                    Bio
                    <span className="text-white/50 font-normal ml-1">
                        ({formData.bio.length}/500)
                    </span>
                </label>
                <textarea 
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 transition-all resize-none"
                    rows="4"
                    placeholder="Tell other gamers about yourself..."
                    disabled={isSaving}
                    maxLength="500"
                />
                <p className="text-white/50 text-xs mt-1">
                    Share your gaming interests, favorite genres, or what you're looking for in teammates
                </p>
            </div>
            
            {/* Avatar URL Field */}
            <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">
                    Avatar URL
                </label>
                <input 
                    type="url"
                    name="avatar_url"
                    value={formData.avatar_url}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-white placeholder-white/50 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 transition-all"
                    placeholder="https://example.com/avatar.jpg"
                    disabled={isSaving}
                />
                <p className="text-white/50 text-xs mt-1">
                    <strong>Note:</strong> Steam avatar will take priority if connected
                </p>
                
                {/* Avatar Preview */}
                {formData.avatar_url && (
                    <div className="mt-3 flex items-center space-x-3">
                        <img 
                            src={formData.avatar_url} 
                            alt="Avatar Preview" 
                            className="w-12 h-12 rounded-full border-2 border-white/20 object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'block';
                            }}
                        />
                        <div className="hidden text-red-400 text-sm">
                            ⚠️ Invalid image URL
                        </div>
                        <span className="text-white/60 text-sm">Preview</span>
                    </div>
                )}
            </div>
            
            {/* Gaming Style Field */}
            <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">
                    Gaming Style
                </label>
                <select 
                    name="gaming_style"
                    value={formData.gaming_style}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 transition-all"
                    disabled={isSaving}
                >
                    <option value="">Select your gaming style</option>
                    {gamingStyles.map(style => (
                        <option key={style} value={style} className="bg-slate-800">
                            {style}
                        </option>
                    ))}
                </select>
                <p className="text-white/50 text-xs mt-1">
                    How do you prefer to approach gaming?
                </p>
            </div>
            
            {/* Favorite Genres Field */}
            <div>
                <label className="block text-white/70 text-sm mb-3 font-medium">
                    Favorite Genres 
                    <span className="text-white/50 font-normal ml-1">
                        ({formData.favorite_genres.length}/8)
                    </span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableGenres.map(genre => (
                        <button 
                            key={genre}
                            onClick={() => handleGenreToggle(genre)}
                            disabled={isSaving || (formData.favorite_genres.length >= 8 && !formData.favorite_genres.includes(genre))}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                                formData.favorite_genres.includes(genre)
                                    ? 'bg-coral-500 text-white border-2 border-coral-400'
                                    : 'bg-white/10 text-white hover:bg-white/20 border-2 border-transparent'
                            }`}
                            title={formData.favorite_genres.length >= 8 && !formData.favorite_genres.includes(genre) 
                                ? 'Maximum 8 genres allowed' 
                                : `Click to ${formData.favorite_genres.includes(genre) ? 'remove' : 'add'} ${genre}`
                            }
                        >
                            {genre}
                        </button>
                    ))}
                </div>
                <p className="text-white/50 text-xs mt-2">
                    Select up to 8 genres that best represent your gaming preferences
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-white/10">
                <button 
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges()}
                    className="flex-1 px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    title={!hasChanges() ? 'No changes to save' : 'Save your profile changes'}
                >
                    {isSaving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            Saving...
                        </>
                    ) : (
                        '💾 Save Changes'
                    )}
                </button>
                <button 
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50"
                >
                    ❌ Cancel
                </button>
            </div>

            {/* Changes Indicator */}
            {hasChanges() && !isSaving && (
                <div className="text-center">
                    <p className="text-orange-300 text-sm flex items-center justify-center gap-2">
                        <span>⚠️</span>
                        You have unsaved changes
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProfileEditForm;