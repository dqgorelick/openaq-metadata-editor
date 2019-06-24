import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import Header from '../components/header';
import Map from '../components/map';
import { getMetadata } from '../state/locations/actions';

class LocationView extends React.Component {
  componentDidMount () {
    const { match: { params: { id } } } = this.props;

    if (!this.props.location) {
      this.props.getMetadata(id);
    }
  }

  render () {
    const { location, match } = this.props;
    if (!location) return null;

    const { metadata } = location;

    return (
      <div className='page page--location-view'>
        <Header>
          <h1 className='page__title'>
            <span className='location-id'>{metadata.locationId}</span>
            <span className='location-name'>{location.location}</span>
            <span className='location-city'>{location.city}, {metadata.country}</span>
          </h1>
        </Header>

        <main role='main'>
          <div className='inner'>
            <div className='row'>
              <ul className='location-detail-list'>
                <li>Location: <b>{location.location}</b></li>
                <li>City: <b>{location.city}</b></li>
                <li>Country: <b>{location.country}</b></li>
                <li>Latitude: <b>{metadata.coordinates.latitude}</b></li>
                <li>Longitude: <b>{metadata.coordinates.longitude}</b></li>
                <li>Location Type: <b>{metadata.siteType}</b></li>
              </ul>

              <Map
                zoom={10}
                width={300}
                coordinates={{
                  lat: metadata.coordinates.latitude,
                  lon: metadata.coordinates.longitude
                }}
              />
            </div>

            <div className='location-view-section'>
              <h2 className='location-view-header'>
                Site Details
              </h2>
              <dl>
                <dt>Elevation</dt>
                <dd>{metadata.elevation}</dd>
                <dt>Site type</dt>
                <dd>{metadata.siteType}</dd>
                <dt>Description</dt>
                <dd>{metadata.notes}</dd>
              </dl>
            </div>

            <div className='location-view-section'>
              <h2 className='location-view-header'>
                Maintenance
              </h2>
              <dl>
                <dt>Installation Date</dt>
                <dd>{metadata.activationDate}</dd>
                <dt>Deactivation Date</dt>
                <dd>{metadata.deactivationDate}</dd>
              </dl>
            </div>

            <div className='location-view-section'>
              <h2 className='location-view-header'>
                Instruments
              </h2>
              <div className='flex'>
                {
                  metadata.instruments.map((instr, i) => {
                    return (
                      <div className='column' key={`instrument-${i}`}>
                        <h3 className=''>
                          Instrument {i}
                        </h3>
                        <dl>
                          <dt>Pollutants</dt>
                          <dd><b>{instr.parameters.join(', ')}</b></dd>
                          <dt>Model</dt>
                          <dd>{instr.modelName}</dd>
                          <dt>Manufacturer</dt>
                          <dd>{instr.manufacturer}</dd>
                          <dt>Installed</dt>
                          <dd>{instr.activationDate}</dd>
                        </dl>
                      </div>
                    );
                  })
                }
              </div>
            </div>

          </div>
          <div className='callout-button'>
            <Link to={`/location/edit/${match.params.id}`}>
              See something missing? Edit this location
            </Link>
          </div>
        </main>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    location: state.locations.location
  };
};

const mapDispatchToProps = {
  getMetadata
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LocationView);