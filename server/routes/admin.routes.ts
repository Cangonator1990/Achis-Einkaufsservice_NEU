import express from 'express';

const router = express.Router();

/**
 * POST /api/v2/admin/orders/:id/suggest-date
 * Admin schlägt neuen Liefertermin für Bestellung vor
 */
router.post('/orders/:id/suggest-date', async (req, res) => {
  try {
    const { id } = req.params;
    const { suggestedDate } = req.body;

    if (!suggestedDate) {
      return res.status(400).json({ error: 'Kein vorgeschlagenes Datum angegeben.' });
    }

    console.log(`Empfangener Liefertermin-Vorschlag für Bestellung #${id}: ${suggestedDate}`);

    // Beispielhafte Antwort (Datenbank-Update musst du noch einbauen)
    return res.status(200).json({
      success: true,
      message: `Lieferterminvorschlag für Bestellung #${id} wurde empfangen.`,
      data: {
        orderId: id,
        suggestedDate,
      },
    });

  } catch (err) {
    console.error('Fehler beim Vorschlag eines Liefertermins:', err);
    return res.status(500).json({ error: 'Interner Serverfehler beim Vorschlag des Liefertermins.' });
  }
});

export default router;
