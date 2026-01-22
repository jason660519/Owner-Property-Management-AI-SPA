-- ======================================================================================
-- Title: Create Unified Properties View
-- Date: 2026-01-22
-- Description: Creates a unified view combining Property_Sales and Property_Rentals
--              to provide a single interface for frontend access
-- ======================================================================================

-- Create a unified properties view that combines both sales and rental properties
CREATE OR REPLACE VIEW public.properties AS
SELECT 
    id,
    owner_id,
    address,
    'sale' AS property_type,
    price AS price,
    NULL::NUMERIC AS monthly_rent,
    status,
    details,
    created_at
FROM public.Property_Sales

UNION ALL

SELECT 
    id,
    owner_id,
    address,
    'rental' AS property_type,
    NULL::NUMERIC AS price,
    monthly_rent,
    status,
    details,
    created_at
FROM public.Property_Rentals;

-- Add comment for documentation
COMMENT ON VIEW public.properties IS 'Unified view combining Property_Sales and Property_Rentals for simplified frontend access';

-- Create an INSTEAD OF trigger function for INSERT operations
CREATE OR REPLACE FUNCTION public.properties_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.property_type = 'sale' THEN
        INSERT INTO public.Property_Sales (id, owner_id, address, price, status, details, created_at)
        VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            NEW.owner_id,
            NEW.address,
            COALESCE(NEW.price, 0),
            COALESCE(NEW.status, 'available'),
            COALESCE(NEW.details, '{}'::jsonb),
            COALESCE(NEW.created_at, NOW())
        );
    ELSIF NEW.property_type = 'rental' THEN
        INSERT INTO public.Property_Rentals (id, owner_id, address, monthly_rent, status, details, created_at)
        VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            NEW.owner_id,
            NEW.address,
            COALESCE(NEW.monthly_rent, 0),
            COALESCE(NEW.status, 'vacant'),
            COALESCE(NEW.details, '{}'::jsonb),
            COALESCE(NEW.created_at, NOW())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create INSTEAD OF trigger for INSERT
CREATE TRIGGER properties_insert_instead
INSTEAD OF INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.properties_insert_trigger();

-- Create an INSTEAD OF trigger function for UPDATE operations
CREATE OR REPLACE FUNCTION public.properties_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.property_type = 'sale' THEN
        UPDATE public.Property_Sales
        SET 
            address = NEW.address,
            price = COALESCE(NEW.price, price),
            status = NEW.status,
            details = COALESCE(NEW.details, details)
        WHERE id = OLD.id;
    ELSIF OLD.property_type = 'rental' THEN
        UPDATE public.Property_Rentals
        SET 
            address = NEW.address,
            monthly_rent = COALESCE(NEW.monthly_rent, monthly_rent),
            status = NEW.status,
            details = COALESCE(NEW.details, details)
        WHERE id = OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create INSTEAD OF trigger for UPDATE
CREATE TRIGGER properties_update_instead
INSTEAD OF UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.properties_update_trigger();

-- Create an INSTEAD OF trigger function for DELETE operations
CREATE OR REPLACE FUNCTION public.properties_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.property_type = 'sale' THEN
        DELETE FROM public.Property_Sales WHERE id = OLD.id;
    ELSIF OLD.property_type = 'rental' THEN
        DELETE FROM public.Property_Rentals WHERE id = OLD.id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create INSTEAD OF trigger for DELETE
CREATE TRIGGER properties_delete_instead
INSTEAD OF DELETE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.properties_delete_trigger();

-- Grant appropriate permissions
GRANT SELECT ON public.properties TO authenticated;
GRANT INSERT ON public.properties TO authenticated;
GRANT UPDATE ON public.properties TO authenticated;
GRANT DELETE ON public.properties TO authenticated;
