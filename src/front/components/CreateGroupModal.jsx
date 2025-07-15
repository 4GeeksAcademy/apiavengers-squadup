// src/front/components/CreateGroupModal.jsx

import React, { useState } from 'react';

const CreateGroupModal = ({ isOpen, onClose, onSubmit }) => {
    const [groupName, setGroupName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (groupName.trim()) {
            onSubmit(groupName);
        }
    };

    return (
        <div 
            onClick={onClose} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        >
            <div 
                onClick={e => e.stopPropagation()}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl w-full max-w-md"
            >
                <h2 className="text-2xl font-bold text-white mb-4">Create a New Group</h2>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="groupName" className="block text-sm font-medium text-white/80 mb-2">
                        Group Name
                    </label>
                    <input
                        id="groupName"
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g., The Weekend Warriors"
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/50"
                        autoFocus
                    />
                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-lg transition-all"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;