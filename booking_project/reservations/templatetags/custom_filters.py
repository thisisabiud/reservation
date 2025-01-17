from django import template

register = template.Library()

@register.filter(name='add_currency')
def add_currency(value):
    """Adds TZS currency symbol and formats the number without decimals."""
    try:
        # Convert to integer to remove decimals
        value = int(float(value))
        # Format with thousand separator
        formatted_value = "{:,}".format(value)
        return f"TZS {formatted_value}/="
    except (ValueError, TypeError):
        return value
