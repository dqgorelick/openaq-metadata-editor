import React from 'react';
import { Link } from 'react-router-dom';

class Table extends React.Component {
  renderLocations (locations) {
    return (
      <tbody>
        {
          locations.map((location, i) => this.renderLocation(location, i))
        }
      </tbody>
    );
  }

  renderLocation (location, index) {
    const locationUrl = `/location/${location.id}`;
    return (
      <tr key={`location-table-row-${index}`}>
        <td>
          <Link to={locationUrl}>
            {location.id}
          </Link>
        </td>
        <td>
          <Link to={locationUrl}>
            {location.country}
          </Link>
        </td>
        <td>
          <Link to={locationUrl}>
            {location.city}
          </Link>
        </td>
        <td>
          <Link to={locationUrl}>
            {location.activationDate}
          </Link>
        </td>
        <td>
          <Link to={locationUrl}>
            {location.siteType}
          </Link>
        </td>
        <td>
          <Link to={locationUrl}>
            {location.instruments.length}
          </Link>
        </td>
        <td>
          <Link to={locationUrl}>
            {location.altitude}
          </Link>
        </td>
      </tr>
    );
  }

  render () {
    const { locations } = this.props;

    return (
      <section className='fold'>
        <div className='inner'>
          <div className='responsive-table-wrapper'>
            <table className='table table--zebra table-with-link-rows'>
              <thead>
                <tr>
                  <th>Station ID</th>
                  <th>Country</th>
                  <th>City</th>
                  <th>Activated</th>
                  <th>Site Type</th>
                  <th>Instruments</th>
                  <th>Altitude (m)</th>
                </tr>
              </thead>
              { this.renderLocations(locations) }
            </table>
          </div>
        </div>
      </section>
    );
  }
}

export default Table;
