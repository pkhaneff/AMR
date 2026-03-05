class PropertyDecoder {
  static decodeValue(property) {
    if (!property || !property.type) {
      return null;
    }

    const { type, boolValue, int32Value, stringValue, value } = property;

    if (type === 'bool' && boolValue !== undefined) {
      return boolValue;
    }

    if (type === 'int' && int32Value !== undefined) {
      return int32Value;
    }

    if (type === 'string' && stringValue !== undefined) {
      return stringValue;
    }

    if (value) {
      return this.decodeBase64(value, type);
    }

    return null;
  }

  static decodeBase64(base64String, type) {
    try {
      const decoded = Buffer.from(base64String, 'base64').toString('utf-8');

      if (type === 'bool') {
        return decoded.toLowerCase() === 'true';
      }

      if (type === 'int') {
        return parseInt(decoded, 10);
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }
}

module.exports = PropertyDecoder;
