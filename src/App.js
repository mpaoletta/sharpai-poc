
import React, { useEffect, useReducer, useState } from "react";




// Generates random value between 0 and 1
function randomValue() {
  return Math.random();
}

function generateImages() {
  let images = [];
  for (let i = 0; i < 100; i++) {
    images.push({
      lightning: randomValue(),
      focus: randomValue(),
      sharpness: randomValue(),
      contrast: randomValue(),
      saturation: randomValue(),
    });
  }
  return images;
}


const ImageFilter = ({ index, filter, dispatch }) => {
  const total = filter.approved.length + filter.rejected.length;
  const approvalPercentage = total === 0 ? 0 : (filter.approved.length / total) * 100;
  const rejectionPercentage = 100 - approvalPercentage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'left', marginRight: '20px' }}>
      <div style={{ marginBottom: '10px' }}>
        Approved: <span style={{ color: 'green' }}>{filter.approved.length}</span>
      </div>
      <div style={{ marginBottom: '10px' }}>
        Rejected: <span style={{ color: 'red' }}>{filter.rejected.length}</span>
      </div>
      <div style={{ marginBottom: '10px' }}>
        Total: <span style={{ color: 'black' }}>{total}</span>
      </div>
      <div style={{ display: 'flex', height: '20px', marginBottom: '20px' }}>
        <div style={{ flex: rejectionPercentage, backgroundColor: 'red' }}></div>
        <div style={{ flex: approvalPercentage, backgroundColor: 'green' }}></div>
      </div>
      <h3>{filter.name}</h3> 
      <input type="range" min="0" max="1" step="0.1" value={filter.threshold} onChange={(e) => dispatch({ type: 'updateFilter', index, threshold: parseFloat(e.target.value) })} />
      <div>Threshold: {filter.threshold}</div>
    </div>
  );
};




// Evaluation functions for each filter
const evaluationFunctions = {
  lightning: (image, threshold) => Promise.resolve(Math.pow(image.lightning, 2.3) > threshold),
  focus: (image, threshold) => Promise.resolve(Math.pow(image.focus, 1.7) > threshold),
  sharpness: (image, threshold) => Promise.resolve(Math.pow(image.sharpness,0.3) > threshold),
  contrast: (image, threshold) => Promise.resolve(Math.pow(image.contrast, 0.8) > threshold),
  saturation: (image, threshold) => Promise.resolve(Math.pow(image.saturation,4) > threshold)
};

const initialState = {
  filters: [
    { name: 'lightning', threshold: 0.5, approved: [], rejected: [] },
    { name: 'focus', threshold: 0.5, approved: [], rejected: [] },
    { name: 'sharpness', threshold: 0.5, approved: [], rejected: [] },
    { name: 'contrast', threshold: 0.5, approved: [], rejected: [] },
    { name: 'saturation', threshold: 0.5, approved: [], rejected: [] }
  ],
  mode: 'tuning',
  filtersNeedUpdate: true,
  updatedFilterIndex: null,
  initialLoad: true,
  finalApprovalRate: 0
};


function reducer(state, action) {
  switch (action.type) {
    case 'updateFilter':
      
      return {
        ...state,
        filters: state.filters.map((filter, index) => {
          if(index === action.index) {
            return {...filter, threshold: action.threshold, needUpdate: true}
          }
          else if(state.mode === 'filtering' && index > action.index) {
            return {...filter, needUpdate: true}; // Reset results of subsequent filters in filtering mode
          } else {
            return filter;
          }
        }),
        filtersNeedUpdate: true,
        updatedFilterIndex: action.index
      };


    case 'updateFilterResults':

      return {
        ...state,
        filters: action.filters,
        initialLoad: action.initialLoad,
        filtersNeedUpdate: false,
        updatedFilterIndex: null
      };
    case 'updateMode':
      return {
        ...state,
        mode: action.mode,
        filters: state.filters.map((filter) => ({...filter, needUpdate: true}))
      };
    default:
      return state;
  }
}


function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [initialImages, setInitialImages] = useState(null);


  useEffect(() => {
    const evaluateFilters = async () => {
      let previousFilterResults = initialImages;
      let newFilters = [...state.filters];

      for (let i = 0; i < newFilters.length; i++) {
        const filter = newFilters[i];

        // Skip filters not being updated in tuning mode and it's not the first render
        if (state.mode === 'tuning' && i !== state.updatedFilterIndex && !state.initialLoad) {
          continue;
        }

        const approved = [];
        const rejected = [];

        const evaluationFunction = evaluationFunctions[filter.name];
        for (const image of previousFilterResults) {
          const result = await evaluationFunction(image, filter.threshold);
          if (result) {
            approved.push(image);
          } else {
            rejected.push(image);
          }
        }

        filter.approved = approved;
        filter.rejected = rejected;

        // In filtering mode, pass the approved images to the next filter
        if (state.mode === 'filtering') {
          previousFilterResults = approved;
        }
      }

      dispatch({ type: 'updateFilterResults', filters: newFilters, initialLoad: false });
    };

    if (initialImages === null) {
      setInitialImages(generateImages());
    } else if (state.filtersNeedUpdate) {
      evaluateFilters();
    }
  }, [state.mode, state.filtersNeedUpdate, initialImages]);

  const finalApprovalRate = (state.mode === 'filtering' && state.filters.length > 0 && initialImages)
    ? (state.filters[state.filters.length - 1].approved.length / initialImages.length) * 100
    : 0;

  return (
    <div style={{ margin: '50px' }}>


      <div style={{ margin: '20px 0', fontSize: '1.5em' }}>
        <select value={state.mode} onChange={(e) => dispatch({ type: 'updateMode', mode: e.target.value })}
            style={{ fontSize: '1.5em', height: '1.5em' }}>
          <option value="filtering">Filtering</option>
          <option value="tuning">Tuning</option>
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {state.filters.map((filter, index) => (
          <React.Fragment key={index}>
            <div style={{ display: 'flex', alignItems: 'center', height: '200px' }} key={index}>

              <ImageFilter key={index} filter={filter} index={index} dispatch={dispatch}/>

              {index < state.filters.length - 1 && 
                <div style={{ display: 'flex', height: '100%', textAlign: 'right',alignItems: 'center', fontSize: '10em',  color: "silver" }}>
                  
                    {state.mode === 'filtering' ? '➔' : ' '}
                  
                </div>
              }
            </div>
          </React.Fragment>
        ))}

      </div>

      {state.mode === 'filtering' && 
        <div style={{ fontSize: '3em', textAlign: 'left', marginTop: '20px' }}>
          Overall Approval Rate: {finalApprovalRate.toFixed(0)}%
        </div>
      }

    </div>
  );
}


export default App;
