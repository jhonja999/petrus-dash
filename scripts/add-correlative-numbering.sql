-- Add correlative numbering and photo documentation fields to discharges table
ALTER TABLE discharges 
ADD COLUMN vale_number VARCHAR(20) UNIQUE,
ADD COLUMN operator_email VARCHAR(255),
ADD COLUMN kilometraje DECIMAL(10,2),
ADD COLUMN ubicacion TEXT,
ADD COLUMN tipo_unidad VARCHAR(50) DEFAULT 'galones',
ADD COLUMN observaciones TEXT,
ADD COLUMN photo_urls TEXT[];

-- Create index for vale_number for faster lookups
CREATE INDEX idx_discharges_vale_number ON discharges(vale_number);

-- Create a sequence for correlative numbering
CREATE SEQUENCE IF NOT EXISTS vale_sequence START 1;

-- Function to generate correlative vale numbers
CREATE OR REPLACE FUNCTION generate_vale_number()
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    next_number INTEGER;
    vale_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get the next number for the current year
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(vale_number FROM 'PE-(\d+)-\d{4}') AS INTEGER
        )
    ), 0) + 1
    INTO next_number
    FROM discharges 
    WHERE vale_number LIKE 'PE-%-' || current_year::TEXT;
    
    -- Format: PE-000001-2025
    vale_number := 'PE-' || LPAD(next_number::TEXT, 6, '0') || '-' || current_year::TEXT;
    
    RETURN vale_number;
END;
$$ LANGUAGE plpgsql;

-- Update existing discharges with vale numbers (optional)
-- UPDATE discharges 
-- SET vale_number = generate_vale_number() 
-- WHERE vale_number IS NULL;

-- Create trigger to auto-generate vale numbers for new discharges
CREATE OR REPLACE FUNCTION set_vale_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.vale_number IS NULL THEN
        NEW.vale_number := generate_vale_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_vale_number
    BEFORE INSERT ON discharges
    FOR EACH ROW
    EXECUTE FUNCTION set_vale_number();

-- Add comments for documentation
COMMENT ON COLUMN discharges.vale_number IS 'Correlative dispatch number in format PE-000001-2025';
COMMENT ON COLUMN discharges.operator_email IS 'Email of the operator who processed the dispatch';
COMMENT ON COLUMN discharges.kilometraje IS 'Vehicle odometer reading';
COMMENT ON COLUMN discharges.ubicacion IS 'Location where the dispatch took place';
COMMENT ON COLUMN discharges.tipo_unidad IS 'Unit type (galones, litros, etc.)';
COMMENT ON COLUMN discharges.observaciones IS 'Additional observations or notes';
COMMENT ON COLUMN discharges.photo_urls IS 'Array of photo URLs for dispatch documentation';
