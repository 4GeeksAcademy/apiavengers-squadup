// src/front/components/CreateGroupModal.jsx - Updated with Custom Button Classes

import React, { useState } from 'react';
import toast from 'react-hot-toast';

const CreateGroupModal = ({ isOpen, onClose, onSubmit, onGroupCreated }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isPublic: false,
        maxMembers: 10
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    // 🔧 ENHANCED: Comprehensive form validation
    const validateForm = () => {
        const newErrors = {};
        
        // Group name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Group name is required';
        } else if (formData.name.trim().length < 3) {
            newErrors.name = 'Group name must be at least 3 characters';
        } else if (formData.name.trim().length > 50) {
            newErrors.name = 'Group name must be less than 50 characters';
        } else if (!/^[a-zA-Z0-9\s\-_!.]+$/.test(formData.name.trim())) {
            newErrors.name = 'Group name contains invalid characters';
        }
        
        // Description validation (optional but with limits)
        if (formData.description && formData.description.length > 500) {
            newErrors.description = 'Description must be less than 500 characters';
        }
        
        // Max members validation
        if (formData.maxMembers < 2) {
            newErrors.maxMembers = 'Group must allow at least 2 members';
        } else if (formData.maxMembers > 50) {
            newErrors.maxMembers = 'Group cannot exceed 50 members';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 🔧 ENHANCED: Real-time field validation
    const handleFieldChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
        
        // Real-time validation for name field
        if (field === 'name') {
            if (value.trim().length > 0 && value.trim().length < 3) {
                setErrors(prev => ({ ...prev, name: 'At least 3 characters required' }));
            } else if (value.length > 50) {
                setErrors(prev => ({ ...prev, name: 'Maximum 50 characters' }));
            }
        }
    };

    // 🔧 FIX 2: Enhanced form submission with error handling
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error('Please fix the form errors before submitting');
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Prepare clean data
            const groupData = {
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                is_public: formData.isPublic,
                max_members: parseInt(formData.maxMembers)
            };
            
            console.log('🚀 Creating group with data:', groupData);
            
            // Use onSubmit if provided, otherwise onGroupCreated (backward compatibility)
            const submitHandler = onSubmit || onGroupCreated;
            
            if (submitHandler) {
                const result = await submitHandler(groupData);
                
                // Only close modal if submission was successful
                if (result !== false) { // Allow handler to return false to prevent closing
                    setFormData({
                        name: '',
                        description: '',
                        isPublic: false,
                        maxMembers: 10
                    });
                    setErrors({});
                    onClose();
                    toast.success('Group created successfully!');
                }
            } else {
                console.error('No submit handler provided to CreateGroupModal');
                toast.error('Configuration error: No submit handler');
            }
        } catch (error) {
            console.error('❌ Error creating group:', error);
            toast.error(error.message || 'Failed to create group');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 🔧 ENHANCED: Handle modal close with unsaved changes warning
    const handleClose = () => {
        const hasUnsavedChanges = formData.name.trim() || formData.description.trim();
        
        if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
        }
        
        // Reset form
        setFormData({
            name: '',
            description: '',
            isPublic: false,
            maxMembers: 10
        });
        setErrors({});
        onClose();
    };

    return (
        <div 
            onClick={handleClose} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div 
                onClick={e => e.stopPropagation()}
                className="card-gaming w-full max-w-md"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white flex items-center">
                            <span className="mr-2">👥</span>
                            Create New Group
                        </h2>
                        <button
                            onClick={handleClose}
                            className="text-white/60 hover:text-white transition-colors p-1"
                            disabled={isSubmitting}
                        >
                            <span className="text-xl">✕</span>
                        </button>
                    </div>
                    <p className="text-white/60 text-sm mt-2">
                        Create a squad to find and vote on games together
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Group Name */}
                    <div>
                        <label htmlFor="groupName" className="block text-sm font-medium text-white/80 mb-2">
                            Group Name *
                        </label>
                        <input
                            id="groupName"
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            placeholder="e.g., The Weekend Warriors"
                            className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 transition-all ${
                                errors.name 
                                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                                    : 'border-white/20 focus:border-coral-500 focus:ring-coral-500/20'
                            }`}
                            disabled={isSubmitting}
                            autoFocus
                            maxLength={50}
                        />
                        {errors.name && (
                            <p className="text-red-400 text-sm mt-1 flex items-center">
                                <span className="mr-1">⚠️</span>
                                {errors.name}
                            </p>
                        )}
                        <p className="text-white/50 text-xs mt-1">
                            {formData.name.length}/50 characters
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            placeholder="What kind of games does your squad like to play?"
                            rows={3}
                            className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 transition-all resize-none ${
                                errors.description 
                                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                                    : 'border-white/20 focus:border-coral-500 focus:ring-coral-500/20'
                            }`}
                            disabled={isSubmitting}
                            maxLength={500}
                        />
                        {errors.description && (
                            <p className="text-red-400 text-sm mt-1 flex items-center">
                                <span className="mr-1">⚠️</span>
                                {errors.description}
                            </p>
                        )}
                        <p className="text-white/50 text-xs mt-1">
                            {formData.description.length}/500 characters
                        </p>
                    </div>

                    {/* Settings Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Max Members */}
                        <div>
                            <label htmlFor="maxMembers" className="block text-sm font-medium text-white/80 mb-2">
                                Max Members
                            </label>
                            <select
                                id="maxMembers"
                                value={formData.maxMembers}
                                onChange={(e) => handleFieldChange('maxMembers', parseInt(e.target.value))}
                                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all ${
                                    errors.maxMembers 
                                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                                        : 'border-white/20 focus:border-coral-500 focus:ring-coral-500/20'
                                }`}
                                disabled={isSubmitting}
                            >
                                {[...Array(49)].map((_, i) => {
                                    const value = i + 2;
                                    return (
                                        <option key={value} value={value}>
                                            {value} members
                                        </option>
                                    );
                                })}
                            </select>
                            {errors.maxMembers && (
                                <p className="text-red-400 text-sm mt-1 flex items-center">
                                    <span className="mr-1">⚠️</span>
                                    {errors.maxMembers}
                                </p>
                            )}
                        </div>

                        {/* Visibility */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Group Visibility
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="visibility"
                                        checked={!formData.isPublic}
                                        onChange={() => handleFieldChange('isPublic', false)}
                                        className="mr-2 text-coral-500 focus:ring-coral-500"
                                        disabled={isSubmitting}
                                    />
                                    <span className="text-white/80 text-sm">🔒 Private</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="visibility"
                                        checked={formData.isPublic}
                                        onChange={() => handleFieldChange('isPublic', true)}
                                        className="mr-2 text-coral-500 focus:ring-coral-500"
                                        disabled={isSubmitting}
                                    />
                                    <span className="text-white/80 text-sm">🌐 Public</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="btn-ghost flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || Object.keys(errors).some(key => errors[key])}
                            className="btn-coral flex-1 flex items-center justify-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <span className="mr-2">🚀</span>
                                    Create Group
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;