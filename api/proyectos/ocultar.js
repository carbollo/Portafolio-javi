'use strict';

const server = require('../../server.js');
const Project = server.Project;
const connectToDatabase = server.connectToDatabase;
const mongoose = require('mongoose');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    await connectToDatabase();
    const id = (req.query && req.query.id) || (req.body && req.body && req.body.id != null ? String(req.body.id).trim() : '') || '';
    const hiddenParam = (req.query && req.query.hidden) || (req.body && req.body.hidden);
    const shouldDelete = hiddenParam === true || hiddenParam === 'true' || hiddenParam === '1';
    if (!id) {
      res.status(400).json({ success: false, error: 'Falta el id' });
      return;
    }
    const conditions = [{ id: id }];
    if (id.length === 24 && /^[a-f0-9A-F]{24}$/.test(id)) {
      try { conditions.push({ _id: new mongoose.Types.ObjectId(id) }); } catch (_) {}
    }
    const query = conditions.length > 1 ? { $or: conditions } : { id: id };
    if (shouldDelete) {
      const deleted = await Project.findOneAndDelete(query);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
        return;
      }
      res.status(200).json({ success: true, deleted: true });
      return;
    }
    const doc = await Project.findOne(query);
    if (!doc) {
      res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
      return;
    }
    doc.hidden = false;
    await doc.save();
    res.status(200).json({ success: true, hidden: false });
  } catch (err) {
    console.error('ocultar.js error:', err);
    res.status(500).json({ success: false, error: err && err.message ? err.message : 'No se pudo actualizar' });
  }
};
