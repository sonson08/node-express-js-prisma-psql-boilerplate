const prisma = require('../db');

const create = (input, output) => prisma.llmLog.create({ data: { input: input, output: output } });

module.exports = { create: create };
