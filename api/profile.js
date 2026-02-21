'use strict';

const server = require('../server.js');
const Profile = server.Profile;
const connectToDatabase = server.connectToDatabase;
const defaultProfile = server.defaultProfile || {
    profileImageUrl: '/images/javier-profile.jpg',
    bio: '',
    email: 'Ljavi141@gmail.com'
};

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        await connectToDatabase();
        if (req.method === 'GET') {
            const doc = await Profile.findOne();
            if (!doc) {
                res.status(200).json(defaultProfile);
                return;
            }
            res.status(200).json({
                profileImageUrl: doc.profileImageUrl || defaultProfile.profileImageUrl,
                bio: doc.bio != null ? doc.bio : defaultProfile.bio,
                email: doc.email || defaultProfile.email
            });
            return;
        }
        if (req.method === 'PUT') {
            let body = req.body;
            if (typeof body === 'string') try { body = JSON.parse(body || '{}'); } catch (_) { body = {}; }
            if (!body || typeof body !== 'object') body = {};
            await Profile.findOneAndUpdate(
                {},
                {
                    profileImageUrl: body.profileImageUrl != null ? body.profileImageUrl : defaultProfile.profileImageUrl,
                    bio: body.bio != null ? body.bio : '',
                    email: body.email != null ? body.email : defaultProfile.email
                },
                { upsert: true, new: true }
            );
            res.status(200).json({ success: true });
            return;
        }
        res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('api/profile.js error:', err);
        res.status(500).json({ success: false, error: err && err.message ? err.message : 'Error al guardar perfil' });
    }
};
