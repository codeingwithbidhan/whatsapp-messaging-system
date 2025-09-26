import React from "react";
import { Phone, PhoneOff, User } from "lucide-react";

const IncomingCallModal = ({ caller, callType, handleAccept, handleReject }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
                <div className="mb-6">
                    {caller.avatar ? (
                        <img
                            src={caller.avatar}
                            alt={caller.name}
                            className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
                        />
                    ) : (
                        <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                            <User className="w-10 h-10 text-gray-600" />
                        </div>
                    )}
                    <h2 className="text-lg font-semibold">{caller.name}</h2>
                    <p className="text-gray-500">Incoming {callType} call</p>
                </div>

                <div className="flex justify-center space-x-6">
                    <button
                        onClick={handleReject}
                        className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="Reject"
                    >
                        <PhoneOff className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleAccept}
                        className="p-4 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                        title="Accept"
                    >
                        <Phone className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IncomingCallModal;
