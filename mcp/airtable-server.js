#!/usr/bin/env node
/**
 * FieldOS Airtable MCP Server
 *
 * Implements the MCP stdio transport (JSON-RPC 2.0 over stdin/stdout).
 * No npm dependencies — uses only Node built-ins (https, readline).
 *
 * Tools exposed:
 *   list_records   — list records from any FieldOS table
 *   get_record     — fetch a single record by ID
 *   create_record  — create a new record
 *   update_record  — patch fields on an existing record
 *
 * Configuration (environment variables):
 *   AIRTABLE_TOKEN — Airtable personal access token (required)
 */

'use strict';

const https = require('https');
const readline = require('readline');

// ── Config ────────────────────────────────────────────────────────────────────

const BASE    = 'appZCJsrVAGM05AgJ';
const TOKEN   = process.env.AIRTABLE_TOKEN || '';

const TABLES = {
  projects:    'tblTbN6Y1wjsHzBSz',
  logs:        'tblJvYLpt96EKyRBc',
  constraints: 'tblbARfnT4DRBSUL5',
  comms:       'tblaMTiWZvsxjKiR6',
  cos:         'tbljkAG7aDgM0Imyn',
  rfis:        'tblUWQS2ReW73GJsy',
  submittals:  'tblo8GH6y5ZF8QpXn',
  team:        'tbllE4hlKH7bsvbhZ',
  audit:       'tblhCHK0eNhIn5yHY',
};

// ── Airtable helpers ──────────────────────────────────────────────────────────

function resolveTable(name) {
  const id = TABLES[name] || name; // accept friendly name or raw ID
  if (!id) throw new Error(`Unknown table: "${name}". Valid names: ${Object.keys(TABLES).join(', ')}`);
  return id;
}

function buildQS(params) {
  const p = [];
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null || val === '') continue;
    if (Array.isArray(val)) {
      if (val.length && typeof val[0] === 'object') {
        val.forEach((obj, i) =>
          Object.entries(obj).forEach(([k, v]) =>
            p.push(`${encodeURIComponent(`${key}[${i}][${k}]`)}=${encodeURIComponent(v)}`)));
      } else {
        val.forEach(v => p.push(`${encodeURIComponent(`${key}[]`)}=${encodeURIComponent(v)}`));
      }
    } else {
      p.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  }
  return p.join('&');
}

function atRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const qs   = (method === 'GET' && body) ? '?' + buildQS(body) : '';
    const opts = {
      hostname: 'api.airtable.com',
      path:     `/v0/${BASE}/${path}${qs}`,
      method,
      headers: {
        Authorization:  'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
      },
    };
    const bodyStr = (method !== 'GET' && body) ? JSON.stringify(body) : null;
    if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Invalid JSON from Airtable')); }
        } else {
          reject(new Error(`Airtable ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function listAll(tableId, params) {
  const rows = [];
  let offset;
  do {
    const p = { ...params };
    if (offset) p.offset = offset;
    const d = await atRequest('GET', tableId, p);
    rows.push(...d.records);
    offset = d.offset;
  } while (offset);
  return rows;
}

// ── Tool implementations ──────────────────────────────────────────────────────

const TOOLS = {
  list_records: {
    description: 'List records from a FieldOS Airtable table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: `Table to query. Use a friendly name (${Object.keys(TABLES).join(', ')}) or a raw table ID.`,
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Field names to return. Omit to return all fields.',
        },
        filterByFormula: {
          type: 'string',
          description: "Airtable formula to filter records, e.g. \"{Status}='Active'\"",
        },
        sort: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              direction: { type: 'string', enum: ['asc', 'desc'] },
            },
            required: ['field'],
          },
          description: 'Sort specification, e.g. [{field: "Date", direction: "desc"}]',
        },
        maxRecords: {
          type: 'number',
          description: 'Maximum number of records to return (default 50, max 100)',
        },
      },
      required: ['table'],
    },
    async call({ table, fields, filterByFormula, sort, maxRecords = 50 }) {
      const tableId = resolveTable(table);
      const params  = { maxRecords };
      if (fields && fields.length)     params.fields          = fields;
      if (filterByFormula)             params.filterByFormula = filterByFormula;
      if (sort && sort.length)         params.sort            = sort;
      const records = await listAll(tableId, params);
      return JSON.stringify(records, null, 2);
    },
  },

  get_record: {
    description: 'Fetch a single Airtable record by its ID',
    inputSchema: {
      type: 'object',
      properties: {
        table:    { type: 'string', description: 'Friendly table name or raw table ID' },
        recordId: { type: 'string', description: 'Airtable record ID (starts with "rec")' },
      },
      required: ['table', 'recordId'],
    },
    async call({ table, recordId }) {
      const tableId = resolveTable(table);
      const record  = await atRequest('GET', `${tableId}/${recordId}`);
      return JSON.stringify(record, null, 2);
    },
  },

  create_record: {
    description: 'Create a new record in a FieldOS Airtable table',
    inputSchema: {
      type: 'object',
      properties: {
        table:  { type: 'string', description: 'Friendly table name or raw table ID' },
        fields: {
          type: 'object',
          description: 'Key/value pairs of field names and values to set',
        },
      },
      required: ['table', 'fields'],
    },
    async call({ table, fields }) {
      const tableId = resolveTable(table);
      const record  = await atRequest('POST', tableId, { fields });
      return JSON.stringify(record, null, 2);
    },
  },

  update_record: {
    description: 'Update (PATCH) fields on an existing Airtable record',
    inputSchema: {
      type: 'object',
      properties: {
        table:    { type: 'string', description: 'Friendly table name or raw table ID' },
        recordId: { type: 'string', description: 'Airtable record ID (starts with "rec")' },
        fields: {
          type: 'object',
          description: 'Fields to update — only listed fields are changed',
        },
      },
      required: ['table', 'recordId', 'fields'],
    },
    async call({ table, recordId, fields }) {
      const tableId = resolveTable(table);
      const record  = await atRequest('PATCH', `${tableId}/${recordId}`, { fields });
      return JSON.stringify(record, null, 2);
    },
  },
};

// ── MCP JSON-RPC transport ────────────────────────────────────────────────────

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function error(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

async function handle(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'fieldos-airtable', version: '1.0.0' },
      },
    });
    return;
  }

  if (method === 'notifications/initialized') return; // no response needed

  if (method === 'tools/list') {
    send({
      jsonrpc: '2.0', id,
      result: {
        tools: Object.entries(TOOLS).map(([name, t]) => ({
          name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    });
    return;
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const tool = TOOLS[name];
    if (!tool) {
      error(id, -32601, `Unknown tool: ${name}`);
      return;
    }
    if (!TOKEN) {
      send({
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: 'Error: AIRTABLE_TOKEN environment variable is not set.' }],
          isError: true,
        },
      });
      return;
    }
    try {
      const text = await tool.call(args || {});
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
    } catch (e) {
      send({
        jsonrpc: '2.0', id,
        result: { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true },
      });
    }
    return;
  }

  error(id, -32601, `Method not found: ${method}`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', line => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try { msg = JSON.parse(trimmed); }
  catch { return; } // silently ignore non-JSON lines
  handle(msg).catch(e => process.stderr.write(`[fieldos-airtable] Unhandled error: ${e.message}\n`));
});

process.stderr.write('[fieldos-airtable] MCP server started\n');
