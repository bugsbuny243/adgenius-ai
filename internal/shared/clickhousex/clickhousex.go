package clickhousex

import "net/url"

func ValidateDSN(dsn string) error {
	_, err := url.Parse(dsn)
	return err
}
