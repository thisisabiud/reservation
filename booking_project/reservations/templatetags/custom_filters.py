from django import template

register = template.Library()

@register.filter(name='add_currency')
def add_currency(value):
    """Adds TZS currency symbol and formats the number with commas."""
    try:
        # Ensure it's a float for proper formatting
        value = float(value)
        formatted_value = "{:,.2f}".format(value)  # Format with commas and 2 decimal places
        return f"TZS {formatted_value}/="  # Add currency prefix
    except (ValueError, TypeError):
        return value  # Return the value as is if it's not a valid number
