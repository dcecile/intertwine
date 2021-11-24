-- migrate:up
CREATE TABLE info_slug (
  id
    BYTES NOT NULL REFERENCES info (id),
  language
    language NOT NULL,
  slug
    STRING NOT NULL,
  PRIMARY KEY (language, slug)
);
GRANT SELECT ON TABLE info_slug TO api_read;
GRANT SELECT, INSERT, UPDATE ON TABLE info_slug TO api_write;

-- migrate:down
DROP TABLE info_slug;
