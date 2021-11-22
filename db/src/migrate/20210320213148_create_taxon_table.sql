-- migrate:up
CREATE TABLE taxon (
  id
    BYTES PRIMARY KEY,
  created_at
    TIMESTAMPTZ(0) DEFAULT current_timestamp(0) NOT NULL,
  created_by
    BYTES NULL REFERENCES member (id),
  updated_at
    TIMESTAMPTZ(0) DEFAULT current_timestamp(0) NOT NULL,
  updated_by
    BYTES NULL REFERENCES member (id),
  deleted
    BOOL DEFAULT true NOT NULL,
  language
    language NOT NULL,
  cross_language_id
    BYTES NOT NULL,
  rank
    rank NOT NULL,
  parent_taxon_id
    BYTES NULL REFERENCES taxon (id),
  names
    JSONB DEFAULT jsonb_build_array() NOT NULL,
  slug
    STRING DEFAULT '' NOT NULL,
  content
    STRING DEFAULT '' NOT NULL
);
CREATE INDEX taxon_cross_language_id_idx
  ON taxon (cross_language_id);
CREATE INDEX taxon_updated_at_idx ON taxon (updated_at);
GRANT SELECT ON TABLE taxon TO api_read;
GRANT SELECT, INSERT, UPDATE ON TABLE taxon TO api_write;

-- migrate:down
DROP TABLE taxon;
